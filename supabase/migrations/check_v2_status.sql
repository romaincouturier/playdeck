-- ============================================================================
-- Script de vérification de l'état de la migration v2
-- ============================================================================
-- Ce script vérifie si la migration v2 a été correctement appliquée
-- ============================================================================

-- Test 1: Vérifier que la table game_master existe
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'game_master'
  ) THEN
    RAISE NOTICE '✅ Table game_master: OK';
  ELSE
    RAISE EXCEPTION '❌ Table game_master: MANQUANTE - Migration v2 non appliquée!';
  END IF;
END $$;

-- Test 2: Vérifier que la table turn_state existe
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'turn_state'
  ) THEN
    RAISE NOTICE '✅ Table turn_state: OK';
  ELSE
    RAISE EXCEPTION '❌ Table turn_state: MANQUANTE - Migration v2 non appliquée!';
  END IF;
END $$;

-- Test 3: Vérifier que games.game_master_id existe
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'games'
    AND column_name = 'game_master_id'
  ) THEN
    RAISE NOTICE '✅ Colonne games.game_master_id: OK';
  ELSE
    RAISE EXCEPTION '❌ Colonne games.game_master_id: MANQUANTE - Migration v2 non appliquée!';
  END IF;
END $$;

-- Test 4: Vérifier que games.host_id n'existe PLUS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'games'
    AND column_name = 'host_id'
  ) THEN
    RAISE NOTICE '✅ Colonne games.host_id supprimée: OK';
  ELSE
    RAISE EXCEPTION '❌ Colonne games.host_id existe encore - Migration v2 non complétée!';
  END IF;
END $$;

-- Test 5: Vérifier que la table zones existe avec game_id
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'zones'
    AND column_name = 'game_id'
  ) THEN
    RAISE NOTICE '✅ Table zones avec game_id: OK';
  ELSE
    RAISE EXCEPTION '❌ Table zones incorrecte - Migration v2 non appliquée!';
  END IF;
END $$;

-- Test 6: Vérifier que game_cards.zone_id existe
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'game_cards'
    AND column_name = 'zone_id'
  ) THEN
    RAISE NOTICE '✅ Colonne game_cards.zone_id: OK';
  ELSE
    RAISE EXCEPTION '❌ Colonne game_cards.zone_id: MANQUANTE - Migration v2 non appliquée!';
  END IF;
END $$;

-- Si on arrive ici, tout est bon!
RAISE NOTICE '🎉 Migration v2 appliquée avec succès!';
