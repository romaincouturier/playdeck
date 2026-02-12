-- ============================================================================
-- FIX v3: Corriger le type de game_cards.zone_id (méthode CREATE + RENAME)
-- ============================================================================
-- Problème: Impossible de convertir directement zone_id TEXT → UUID
-- Solution: Créer nouvelle colonne UUID, copier valeurs valides, swap colonnes
-- ============================================================================

-- 1. Supprimer les contraintes FK existantes
DO $$
BEGIN
  -- Supprimer toutes les FK qui pointent sur zone_id
  PERFORM 1 FROM information_schema.table_constraints
  WHERE constraint_name = 'game_cards_zone_id_fkey'
    AND table_name = 'game_cards';

  IF FOUND THEN
    ALTER TABLE game_cards DROP CONSTRAINT game_cards_zone_id_fkey;
    RAISE NOTICE '✅ Contrainte FK supprimée';
  END IF;
END $$;

-- 2. Vérifier le type actuel
DO $$
DECLARE
  current_type text;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'game_cards' AND column_name = 'zone_id';

  RAISE NOTICE 'Type actuel de zone_id: %', current_type;
END $$;

-- 3. Si zone_id est TEXT, le convertir via CREATE + RENAME
DO $$
DECLARE
  current_type text;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'game_cards' AND column_name = 'zone_id';

  IF current_type IN ('text', 'character varying') THEN
    RAISE NOTICE 'Conversion de zone_id TEXT → UUID via nouvelle colonne...';

    -- Créer une nouvelle colonne temporaire de type UUID
    ALTER TABLE game_cards ADD COLUMN zone_id_new UUID;
    RAISE NOTICE '  → Colonne zone_id_new créée';

    -- Copier les valeurs valides (UUID uniquement)
    UPDATE game_cards
    SET zone_id_new = zone_id::uuid
    WHERE zone_id IS NOT NULL
      AND zone_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    RAISE NOTICE '  → Valeurs UUID valides copiées';

    -- Compter combien de lignes n'ont pas pu être converties
    DECLARE
      invalid_count integer;
    BEGIN
      SELECT COUNT(*) INTO invalid_count
      FROM game_cards
      WHERE zone_id IS NOT NULL
        AND zone_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

      IF invalid_count > 0 THEN
        RAISE NOTICE '  ⚠️  % ligne(s) avec valeurs non-UUID ignorées', invalid_count;
      END IF;
    END;

    -- Supprimer l'ancienne colonne zone_id
    ALTER TABLE game_cards DROP COLUMN zone_id;
    RAISE NOTICE '  → Ancienne colonne zone_id supprimée';

    -- Renommer la nouvelle colonne
    ALTER TABLE game_cards RENAME COLUMN zone_id_new TO zone_id;
    RAISE NOTICE '  → Colonne renommée zone_id_new → zone_id';

    RAISE NOTICE '✅ Conversion terminée avec succès';
  ELSIF current_type = 'uuid' THEN
    RAISE NOTICE '✅ zone_id est déjà de type UUID';
  ELSE
    RAISE EXCEPTION '❌ Type inattendu: %', current_type;
  END IF;
END $$;

-- 4. Vérifier que zones.id existe et est UUID
DO $$
DECLARE
  zones_id_type text;
BEGIN
  SELECT data_type INTO zones_id_type
  FROM information_schema.columns
  WHERE table_name = 'zones' AND column_name = 'id';

  IF zones_id_type IS NULL THEN
    RAISE EXCEPTION '❌ Table zones ou colonne id introuvable';
  ELSIF zones_id_type != 'uuid' THEN
    RAISE EXCEPTION '❌ zones.id n''est pas de type UUID (type actuel: %)', zones_id_type;
  ELSE
    RAISE NOTICE '✅ zones.id est de type UUID';
  END IF;
END $$;

-- 5. Créer la contrainte FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'game_cards_zone_id_fkey'
      AND table_name = 'game_cards'
  ) THEN
    ALTER TABLE game_cards
    ADD CONSTRAINT game_cards_zone_id_fkey
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE;

    RAISE NOTICE '✅ Contrainte FK créée';
  ELSE
    RAISE NOTICE 'ℹ️  Contrainte FK existe déjà';
  END IF;
END $$;

-- 6. Rapport final
DO $$
DECLARE
  zone_id_type text;
  zones_id_type text;
  total_cards integer;
  null_zone_cards integer;
BEGIN
  -- Types
  SELECT data_type INTO zone_id_type
  FROM information_schema.columns
  WHERE table_name = 'game_cards' AND column_name = 'zone_id';

  SELECT data_type INTO zones_id_type
  FROM information_schema.columns
  WHERE table_name = 'zones' AND column_name = 'id';

  -- Statistiques
  SELECT COUNT(*) INTO total_cards FROM game_cards;
  SELECT COUNT(*) INTO null_zone_cards FROM game_cards WHERE zone_id IS NULL;

  RAISE NOTICE '======================';
  RAISE NOTICE 'RAPPORT FINAL:';
  RAISE NOTICE '======================';
  RAISE NOTICE 'Types:';
  RAISE NOTICE '  game_cards.zone_id: %', zone_id_type;
  RAISE NOTICE '  zones.id: %', zones_id_type;
  RAISE NOTICE '';
  RAISE NOTICE 'Statistiques:';
  RAISE NOTICE '  Total cartes: %', total_cards;
  RAISE NOTICE '  Cartes sans zone: %', null_zone_cards;

  IF zone_id_type = zones_id_type THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Migration réussie! Les types correspondent.';
  ELSE
    RAISE EXCEPTION '❌ Les types ne correspondent toujours pas';
  END IF;

  IF null_zone_cards > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ATTENTION: % carte(s) n''ont pas de zone assignée', null_zone_cards;
    RAISE NOTICE '   Ces cartes devront être assignées manuellement ou supprimées.';
  END IF;
END $$;
