-- ============================================================================
-- FIX: Corriger le type de game_cards.zone_id pour correspondre à zones.id
-- ============================================================================
-- Problème: game_cards.zone_id est TEXT mais zones.id est UUID
-- Solution: Convertir zone_id en UUID
-- ============================================================================

-- 1. Supprimer la contrainte de clé étrangère si elle existe déjà (au cas où)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'game_cards_zone_id_fkey'
    AND table_name = 'game_cards'
  ) THEN
    ALTER TABLE game_cards DROP CONSTRAINT game_cards_zone_id_fkey;
    RAISE NOTICE 'Contrainte game_cards_zone_id_fkey supprimée';
  END IF;
END $$;

-- 2. Vérifier le type actuel de game_cards.zone_id
DO $$
DECLARE
  current_type text;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'game_cards' AND column_name = 'zone_id';

  RAISE NOTICE 'Type actuel de game_cards.zone_id: %', current_type;
END $$;

-- 3. Si zone_id existe et est TEXT, le convertir en UUID
DO $$
DECLARE
  current_type text;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'game_cards' AND column_name = 'zone_id';

  IF current_type = 'text' OR current_type = 'character varying' THEN
    RAISE NOTICE 'Conversion de game_cards.zone_id de TEXT vers UUID...';

    -- Supprimer les valeurs qui ne sont pas des UUID valides
    UPDATE game_cards
    SET zone_id = NULL
    WHERE zone_id IS NOT NULL
      AND zone_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- Convertir la colonne en UUID
    ALTER TABLE game_cards
    ALTER COLUMN zone_id TYPE UUID USING zone_id::uuid;

    RAISE NOTICE '✅ game_cards.zone_id converti en UUID';
  ELSIF current_type = 'uuid' THEN
    RAISE NOTICE '✅ game_cards.zone_id est déjà de type UUID';
  ELSE
    RAISE NOTICE 'Type actuel: % - Conversion manuelle nécessaire', current_type;
  END IF;
END $$;

-- 4. Créer la contrainte de clé étrangère maintenant que les types correspondent
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

    RAISE NOTICE '✅ Contrainte game_cards_zone_id_fkey créée';
  ELSE
    RAISE NOTICE 'ℹ️ Contrainte game_cards_zone_id_fkey existe déjà';
  END IF;
END $$;

-- 5. Vérifier que tout est correct
DO $$
DECLARE
  zone_id_type text;
  zones_id_type text;
BEGIN
  SELECT data_type INTO zone_id_type
  FROM information_schema.columns
  WHERE table_name = 'game_cards' AND column_name = 'zone_id';

  SELECT data_type INTO zones_id_type
  FROM information_schema.columns
  WHERE table_name = 'zones' AND column_name = 'id';

  RAISE NOTICE '======================';
  RAISE NOTICE 'Vérification finale:';
  RAISE NOTICE 'game_cards.zone_id: %', zone_id_type;
  RAISE NOTICE 'zones.id: %', zones_id_type;

  IF zone_id_type = zones_id_type THEN
    RAISE NOTICE '✅ Les types correspondent!';
  ELSE
    RAISE EXCEPTION '❌ Les types ne correspondent toujours pas: % vs %', zone_id_type, zones_id_type;
  END IF;
END $$;

RAISE NOTICE '🎉 Migration du type zone_id terminée avec succès!';
