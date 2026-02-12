# Bugs Trouvés dans la Migration v2 - Analyse Approfondie

**Date**: 2026-02-12
**Méthode**: Analyse statique automatisée avec tests unitaires

---

## 🔴 Bugs Critiques (P0)

### Bug #1: Foreign Key Incomplète après Renommage de Colonne

**Fichier**: `supabase/migrations/20260211_v2_universal_engine.sql:515`

**Problème**:
```sql
-- Ligne 515: Renommage de location → zone_id
ALTER TABLE game_cards RENAME COLUMN location TO zone_id;

-- Ligne 521: Tentative d'ajout de FK
ALTER TABLE game_cards
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE CASCADE;
```

**Conséquence**:
1. Si `location` existe déjà (migration v1→v2), elle est renommée en `zone_id`
2. La FK existante sur `location` est conservée mais n'a **peut-être pas** `ON DELETE CASCADE`
3. La ligne 521 ne s'exécute pas (colonne déjà existante via rename)
4. Résultat: `game_cards.zone_id` n'a pas forcément `ON DELETE CASCADE`

**Impact**: Quand une zone est supprimée, les cartes ne sont pas supprimées automatiquement → données orphelines

**Solution**:
```sql
-- Renommer
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_cards' AND column_name = 'location'
  ) THEN
    ALTER TABLE game_cards RENAME COLUMN location TO zone_id;
  END IF;
END $$;

-- Supprimer l'ancienne FK si elle existe
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'game_cards'
    AND kcu.column_name = 'zone_id'
    AND tc.constraint_type = 'FOREIGN KEY';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE game_cards DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Ajouter zone_id avec FK correcte
ALTER TABLE game_cards
  ADD COLUMN IF NOT EXISTS zone_id UUID;

-- Ajouter la FK constraint avec ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'game_cards'
      AND kcu.column_name = 'zone_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE game_cards
      ADD CONSTRAINT game_cards_zone_id_fkey
      FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE;
  END IF;
END $$;
```

---

### Bug #2: Fonction `recycle_discard_to_deck` Ne Gère Pas Zone Vide

**Fichier**: `supabase/migrations/20260211_v2_universal_engine.sql:956`

**Problème**:
```sql
CREATE OR REPLACE FUNCTION recycle_discard_to_deck(p_game_id UUID, p_shuffle BOOLEAN DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_discard_zone_id UUID;
  v_deck_zone_id UUID;
BEGIN
  -- Trouver zones
  SELECT id INTO v_discard_zone_id FROM zones
  WHERE game_id = p_game_id AND type = 'DISCARD';

  SELECT id INTO v_deck_zone_id FROM zones
  WHERE game_id = p_game_id AND type = 'DECK';

  -- Déplacer toutes les cartes
  UPDATE game_cards
  SET zone_id = v_deck_zone_id
  WHERE zone_id = v_discard_zone_id;

  -- Mélanger si demandé
  IF p_shuffle THEN
    -- Shuffle logic
  END IF;
END;
$$;
```

**Conséquence**:
- Si la défausse est vide, la fonction ne fait rien (UPDATE 0 lignes)
- Pas d'erreur levée, mais peut causer des problèmes si l'appelant attend au moins 1 carte

**Impact**: Logique de jeu incorrecte - le code appelant peut assumer que la pioche a été remplie

**Solution**:
```sql
CREATE OR REPLACE FUNCTION recycle_discard_to_deck(p_game_id UUID, p_shuffle BOOLEAN DEFAULT true)
RETURNS INTEGER  -- Retourner le nombre de cartes recyclées
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_discard_zone_id UUID;
  v_deck_zone_id UUID;
  v_card_count INTEGER;
BEGIN
  -- Trouver zones
  SELECT id INTO v_discard_zone_id FROM zones
  WHERE game_id = p_game_id AND type = 'DISCARD';

  SELECT id INTO v_deck_zone_id FROM zones
  WHERE game_id = p_game_id AND type = 'DECK';

  -- Vérifier si zones existent
  IF v_discard_zone_id IS NULL THEN
    RAISE EXCEPTION 'DISCARD zone not found for game_id %', p_game_id;
  END IF;

  IF v_deck_zone_id IS NULL THEN
    RAISE EXCEPTION 'DECK zone not found for game_id %', p_game_id;
  END IF;

  -- Compter les cartes dans la défausse
  SELECT COUNT(*) INTO v_card_count
  FROM game_cards
  WHERE zone_id = v_discard_zone_id;

  -- Retourner 0 si défausse vide (pas une erreur, juste une condition)
  IF v_card_count = 0 THEN
    RETURN 0;
  END IF;

  -- Déplacer toutes les cartes
  UPDATE game_cards
  SET zone_id = v_deck_zone_id
  WHERE zone_id = v_discard_zone_id;

  -- Mélanger si demandé
  IF p_shuffle THEN
    -- Shuffle logic
  END IF;

  RETURN v_card_count;
END;
$$;
```

---

## 🟡 Bugs Mineurs (P1)

### Bug #3: Validation `turn_order` Incomplète

**Fichier**: `supabase/migrations/20260211_v2_universal_engine.sql:1103`

**Problème**:
```sql
CREATE OR REPLACE FUNCTION validate_turn_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_player_id UUID;
  v_invalid_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_invalid_count
  FROM unnest(NEW.turn_order) AS player_id
  WHERE NOT EXISTS (
    SELECT 1 FROM game_players
    WHERE id = player_id
    AND game_id = NEW.game_id
    AND role = 'PLAYER'
  );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'turn_order contains % invalid player IDs', v_invalid_count;
  END IF;

  RETURN NEW;
END;
$$;
```

**Conséquence**:
- Ne vérifie pas si `turn_order` est un tableau vide
- Un `turn_order = []` passerait la validation mais causerait des erreurs dans `get_next_player`

**Impact**: Possible crash runtime quand on appelle `get_next_player` avec un tableau vide

**Solution**:
```sql
CREATE OR REPLACE FUNCTION validate_turn_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_invalid_count INTEGER;
BEGIN
  -- Vérifier que turn_order n'est pas NULL
  IF NEW.turn_order IS NULL THEN
    RAISE EXCEPTION 'turn_order cannot be NULL';
  END IF;

  -- Vérifier que turn_order n'est pas vide
  IF array_length(NEW.turn_order, 1) IS NULL OR array_length(NEW.turn_order, 1) = 0 THEN
    RAISE EXCEPTION 'turn_order cannot be empty';
  END IF;

  -- Vérifier que tous les IDs sont valides
  SELECT COUNT(*)
  INTO v_invalid_count
  FROM unnest(NEW.turn_order) AS player_id
  WHERE NOT EXISTS (
    SELECT 1 FROM game_players
    WHERE id = player_id
    AND game_id = NEW.game_id
    AND role = 'PLAYER'
  );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'turn_order contains % invalid player IDs', v_invalid_count;
  END IF;

  -- Vérifier qu'il n'y a pas de doublons
  IF (SELECT COUNT(DISTINCT unnest) FROM unnest(NEW.turn_order)) < array_length(NEW.turn_order, 1) THEN
    RAISE EXCEPTION 'turn_order contains duplicate player IDs';
  END IF;

  RETURN NEW;
END;
$$;
```

---

## ✅ Faux Positifs (Tests à Corriger)

### FP #1: Policies RLS Existent

**Test échoué**: "zones table should have SELECT policy"

**Réalité**: La policy existe (`CREATE POLICY "Players can view zones in their games" ON zones FOR SELECT`)

**Problème**: Regex de test trop strict (ne gère pas les nouvelles lignes)

**Action**: Corriger les tests, pas la migration

---

### FP #2: Trigger Intentionnellement sur UPDATE

**Test échoué**: "should not have circular dependencies in triggers"

**Réalité**: Le trigger `on_game_start_create_zones` est sur `AFTER UPDATE` intentionnellement

**Raison**: Les zones sont créées quand le statut passe de 'waiting' à 'playing'

**Action**: Corriger le test pour accepter UPDATE

---

## 📊 Statistiques

- **Tests exécutés**: 46
- **Tests passés**: 37 (80%)
- **Bugs critiques trouvés**: 2
- **Bugs mineurs trouvés**: 1
- **Faux positifs**: 6

---

## 🎯 Recommandations

### Priorité Immédiate

1. ✅ Corriger Bug #1 (FK sur game_cards.zone_id)
2. ✅ Corriger Bug #2 (recycle_discard_to_deck gestion zone vide)
3. ✅ Corriger Bug #3 (validation turn_order vide)

### Tests Additionnels Recommandés

1. **Test de migration v1→v2 avec données réelles**
   - Créer une base v1 avec données
   - Appliquer migration v2
   - Vérifier que toutes les FK ont ON DELETE CASCADE

2. **Test de stress sur turn_order**
   - Tester avec 1 joueur
   - Tester avec tableau vide
   - Tester avec doublons

3. **Test de recyclage de défausse**
   - Recycler défausse vide
   - Recycler avec 1 carte
   - Recycler avec 100 cartes

---

## 📝 Méthode de Détection

Ces bugs ont été trouvés par **analyse statique automatisée** via:

1. Parsing du fichier SQL
2. Validation des patterns connus de bugs
3. Vérification de cohérence des FK
4. Analyse de gestion d'erreurs dans les fonctions
5. Vérification de cas limites (NULL, vide, etc.)

**Fichier de test**: `__tests__/unit/v2-migration-deep-analysis.test.ts`

**Commande**: `npm run test:run -- __tests__/unit/v2-migration-deep-analysis.test.ts`
