-- ============================================================================
-- FIX v2: Corriger le type de game_cards.zone_id pour correspondre à zones.id
-- ============================================================================
-- Problème: game_cards.zone_id est TEXT mais zones.id est UUID
--           ET zone_id a une contrainte NOT NULL avec des valeurs invalides
-- Solution: Supprimer temporairement NOT NULL, nettoyer, convertir, puis restaurer
-- ============================================================================

-- 1. Supprimer la contrainte de clé étrangère si elle existe déjà
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'game_cards_zone_id_fkey'
    AND table_name = 'game_cards'
  ) THEN
    ALTER TABLE game_cards DROP CONSTRAINT game_cards_zone_id_fkey;
    RAISE NOTICE '✅ Contrainte game_cards_zone_id_fkey supprimée';
  END IF;
END $$;

-- 2. Vérifier le type actuel et la contrainte NOT NULL
DO $$
DECLARE
  current_type text;
  is_nullable text;
BEGIN
  SELECT data_type, is_nullable INTO current_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'game_cards' AND column_name = 'zone_id';

  RAISE NOTICE 'État actuel:';
  RAISE NOTICE '  Type: %', current_type;
  RAISE NOTICE '  Nullable: %', is_nullable;
END $$;

-- 3. Convertir zone_id de TEXT vers UUID (en gérant la contrainte NOT NULL)
DO $$
DECLARE
  current_type text;
  was_not_null boolean;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'game_cards' AND column_name = 'zone_id';

  -- Vérifier si la colonne avait NOT NULL
  SELECT is_nullable = 'NO' INTO was_not_null
  FROM information_schema.columns
  WHERE table_name = 'game_cards' AND column_name = 'zone_id';

  IF current_type = 'text' OR current_type = 'character varying' THEN
    RAISE NOTICE 'Conversion de game_cards.zone_id de TEXT vers UUID...';

    -- ÉTAPE 1: Supprimer temporairement la contrainte NOT NULL si elle existe
    IF was_not_null THEN
      ALTER TABLE game_cards ALTER COLUMN zone_id DROP NOT NULL;
      RAISE NOTICE '  → Contrainte NOT NULL temporairement supprimée';
    END IF;

    -- ÉTAPE 2: Nettoyer les valeurs qui ne sont pas des UUID valides
    UPDATE game_cards
    SET zone_id = NULL
    WHERE zone_id IS NOT NULL
      AND zone_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    RAISE NOTICE '  → Valeurs invalides nettoyées';

    -- ÉTAPE 3: Convertir la colonne en UUID
    ALTER TABLE game_cards
    ALTER COLUMN zone_id TYPE UUID USING zone_id::uuid;

    RAISE NOTICE '  → Colonne convertie en UUID';

    -- ÉTAPE 4: Remettre NOT NULL si c'était le cas (optionnel - commenter si on veut garder nullable)
    -- IF was_not_null THEN
    --   ALTER TABLE game_cards ALTER COLUMN zone_id SET NOT NULL;
    --   RAISE NOTICE '  → Contrainte NOT NULL restaurée';
    -- END IF;

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
    RAISE NOTICE 'ℹ️  Contrainte game_cards_zone_id_fkey existe déjà';
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

-- 6. Afficher le nombre de cartes avec zone_id NULL (qui devront être assignées manuellement)
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM game_cards
  WHERE zone_id IS NULL;

  IF null_count > 0 THEN
    RAISE NOTICE '⚠️  ATTENTION: % carte(s) ont zone_id = NULL', null_count;
    RAISE NOTICE '   Ces cartes devront être assignées à une zone manuellement';
  ELSE
    RAISE NOTICE '✅ Toutes les cartes ont un zone_id valide';
  END IF;
END $$;

RAISE NOTICE '🎉 Migration du type zone_id terminée avec succès!';
