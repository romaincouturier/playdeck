# Plan de Test Migration v2

## Vérification de Cohérence Migration ↔ Test

### 1. Structure de la table `games`

#### Migration v2 (`20260211_v2_universal_engine.sql`)
**Colonnes ajoutées :**
- ✅ `game_master_id` UUID REFERENCES auth.users(id)
- ✅ `current_round` INTEGER DEFAULT 1
- ✅ `game_mode` TEXT DEFAULT 'UNIVERSAL'

**Colonnes supprimées :**
- ✅ `host_id` (remplacée par `game_master_id`)
- ✅ `current_phase_id`
- ✅ `current_turn_player_id`
- ✅ `current_turn_guest_id`

#### Script de test (`test_v2_migration.sql`)
**Colonnes utilisées dans INSERT :**
```sql
INSERT INTO games (
  id,                    -- ✅ Existant
  code,                  -- ✅ Existant
  status,                -- ✅ Existant
  game_master_id,        -- ✅ Ajouté par migration v2
  deck_id,               -- ✅ Existant
  current_round,         -- ✅ Ajouté par migration v2
  max_players,           -- ✅ Existant
  created_at             -- ✅ Existant
)
```

**✅ COHÉRENCE VALIDÉE** : Le test n'utilise plus `host_id`

---

### 2. Nouvelles Tables

| Table | Migration v2 | Test Script |
|-------|--------------|-------------|
| `game_master` | ✅ Créée | ✅ Testée (insert + select) |
| `zones` | ✅ Créée | ✅ Testée (fonction + select) |
| `primitive_actions` | ✅ Créée | ✅ Testée (insert + select) |
| `turn_state` | ✅ Créée | ✅ Testée (fonction + select) |
| `card_marks` | ✅ Créée | ✅ Testée (select) |
| `game_snapshots` | ✅ Créée | ✅ Testée (fonction + select) |
| `predefined_games` | ✅ Créée | ✅ Testée (select) |
| `player_visibility_overrides` | ✅ Créée | ✅ Testée (select) |

---

### 3. Fonctions SQL

| Fonction | Migration v2 | Test Script |
|----------|--------------|-------------|
| `create_default_zones()` | ✅ Créée | ✅ Appelée |
| `create_player_hand_zone()` | ✅ Créée | ✅ Appelée |
| `get_next_player()` | ✅ Créée | ✅ Appelée |
| `initialize_turn_state()` | ✅ Créée | ✅ Appelée |
| `recycle_discard_to_deck()` | ✅ Créée | ✅ Vérifiée (exists) |
| `calculate_player_score()` | ✅ Créée | ✅ Vérifiée (exists) |
| `create_game_snapshot()` | ✅ Créée | ✅ Appelée |

---

## Procédure de Test

### Étape 1 : Appliquer la migration
```sql
-- Dans Supabase SQL Editor
-- Copier-coller le contenu de: supabase/migrations/20260211_v2_universal_engine.sql
```

### Étape 2 : Vérifier la structure
```sql
-- Vérifier que host_id a été supprimée
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'games'
ORDER BY ordinal_position;

-- Résultat attendu: game_master_id existe, host_id n'existe pas
```

### Étape 3 : Exécuter les tests
```sql
-- Dans Supabase SQL Editor
-- Copier-coller le contenu de: supabase/migrations/test_v2_migration.sql
```

### Étape 4 : Vérifications attendues

**Tests 1-8 : Tables**
- ✅ Toutes doivent retourner `true`

**Tests 9-15 : Fonctions**
- ✅ Toutes doivent retourner `true`

**Test 16 : Jeux prédéfinis**
- ✅ Doit retourner 2 lignes (bataille-classique, uno-simple)

**Test 17 : Création partie test**
- ✅ Doit afficher plusieurs NOTICE dans les logs
- ✅ Doit se terminer avec "Tests complets termines avec succes!"

**Tests 18-25 : Données créées**
- ✅ Partie TEST99 créée
- ✅ Game Master créé
- ✅ 5 zones créées (DECK, CENTER, DISCARD, HAND x2)
- ✅ 2 joueurs créés
- ✅ 3 cartes créées
- ✅ Turn state initialisé
- ✅ 1 action primitive enregistrée
- ✅ 1 snapshot créé

---

## Problèmes Connus Résolus

### ❌ Problème 1 : Colonne `host_id` manquante
**Erreur** : `null value in column "host_id" violates not-null constraint`
**Cause** : Migration v2 ne supprimait pas `host_id`
**✅ Solution** : Ajouté `DROP COLUMN IF EXISTS host_id` dans la migration

### ❌ Problème 2 : Caractères spéciaux SQL
**Erreur** : `syntax error at or near "<"`
**Cause** : Chevrons et box-drawing dans les commentaires
**✅ Solution** : Simplifié le script de test sans caractères spéciaux

---

## Checklist de Validation

Avant de pousser en production :

- [x] Migration v2 supprime `host_id`
- [x] Migration v2 ajoute `game_master_id`
- [x] Test script n'utilise plus `host_id`
- [x] Test script utilise `game_master_id`
- [x] Toutes les nouvelles tables sont créées
- [x] Toutes les fonctions SQL sont créées
- [x] Les jeux prédéfinis sont insérés
- [ ] Migration testée manuellement dans Supabase ✅ **À FAIRE**
- [ ] Script de test exécuté avec succès ✅ **À FAIRE**

---

## Prochaines Étapes

1. **Tester la migration** dans Supabase SQL Editor
2. Si succès → **Commit et push** la migration corrigée
3. Si échec → **Analyser l'erreur** et corriger
4. Une fois migration OK → **Démarrer Phase 1** de l'implémentation (voir MIGRATION_PLAN.md)
