-- ============================================================================
-- ROLLBACK MIGRATION V2 - NETTOYAGE COMPLET
-- ============================================================================
-- Ce script supprime toutes les tables et fonctions créées par la migration v2
-- ATTENTION: Cela supprimera toutes les données de test !
--
-- Utilisation:
-- - Pour nettoyer juste les données de test: exécuter section 1 uniquement
-- - Pour rollback complet v2: exécuter tout le script
-- ============================================================================

-- ============================================================================
-- 1. SUPPRIMER LES DONNÉES DE TEST
-- ============================================================================

-- Supprimer les jeux de test (CASCADE supprime joueurs, zones, cartes, etc.)
DELETE FROM games WHERE code = 'TEST99';
DELETE FROM games WHERE code LIKE 'TEST%';

RAISE NOTICE 'Données de test supprimées';

-- ============================================================================
-- 2. SUPPRIMER LES TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_create_zones_on_game_start ON games;
DROP FUNCTION IF EXISTS trigger_create_default_zones();

RAISE NOTICE 'Triggers supprimés';

-- ============================================================================
-- 3. SUPPRIMER LES FONCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS create_default_zones(UUID);
DROP FUNCTION IF EXISTS create_player_hand_zone(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS get_next_player(UUID, UUID);
DROP FUNCTION IF EXISTS initialize_turn_state(UUID);
DROP FUNCTION IF EXISTS recycle_discard_to_deck(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS calculate_player_score(UUID, UUID);
DROP FUNCTION IF EXISTS create_game_snapshot(UUID);
DROP FUNCTION IF EXISTS restore_game_snapshot(UUID);
DROP FUNCTION IF EXISTS record_primitive_action(UUID, UUID, TEXT, UUID[], UUID, UUID, JSONB);
DROP FUNCTION IF EXISTS apply_primitive_action(UUID);
DROP FUNCTION IF EXISTS get_visible_cards_for_player(UUID, UUID);

RAISE NOTICE 'Fonctions supprimées';

-- ============================================================================
-- 4. SUPPRIMER LES TABLES V2 (dans l'ordre inverse des dépendances)
-- ============================================================================

-- Tables P1/P2
DROP TABLE IF EXISTS card_marks CASCADE;
DROP TABLE IF EXISTS game_snapshots CASCADE;
DROP TABLE IF EXISTS predefined_games CASCADE;
DROP TABLE IF EXISTS player_visibility_overrides CASCADE;

-- Tables P0
DROP TABLE IF EXISTS card_groups CASCADE;
DROP TABLE IF EXISTS card_group_members CASCADE;
DROP TABLE IF EXISTS card_category_membership CASCADE;
DROP TABLE IF EXISTS card_categories CASCADE;
DROP TABLE IF EXISTS primitive_actions CASCADE;
DROP TABLE IF EXISTS turn_state CASCADE;
DROP TABLE IF EXISTS game_rules_text CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS game_master CASCADE;

RAISE NOTICE 'Tables v2 supprimées';

-- ============================================================================
-- 5. RESTAURER CONTRAINTE deck_id NOT NULL (si nécessaire)
-- ============================================================================

-- Remettre deck_id en NOT NULL si vous voulez revenir à v1
-- ALTER TABLE games ALTER COLUMN deck_id SET NOT NULL;

-- ============================================================================
-- 6. SUPPRIMER COLONNES V2 DES TABLES EXISTANTES
-- ============================================================================

-- games: supprimer colonnes v2
ALTER TABLE games
  DROP COLUMN IF EXISTS game_master_id,
  DROP COLUMN IF EXISTS current_round,
  DROP COLUMN IF EXISTS game_mode;

-- game_players: supprimer colonnes v2
ALTER TABLE game_players
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS score;

-- game_cards: supprimer colonnes v2
ALTER TABLE game_cards
  DROP COLUMN IF EXISTS face_visible,
  DROP COLUMN IF EXISTS group_id,
  DROP COLUMN IF EXISTS owner_id;

-- Restaurer zone_id → location si nécessaire
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_cards' AND column_name = 'zone_id') THEN
--     ALTER TABLE game_cards RENAME COLUMN zone_id TO location;
--   END IF;
-- END $$;

-- cards: supprimer colonnes v2
ALTER TABLE cards
  DROP COLUMN IF EXISTS numeric_values;

RAISE NOTICE 'Colonnes v2 supprimées des tables existantes';

-- ============================================================================
-- 7. RESTAURER COLONNES V1 (optionnel - commenté par défaut)
-- ============================================================================

-- Restaurer colonne host_id (si vous voulez revenir à v1)
-- ALTER TABLE games ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES auth.users(id);

-- Restaurer anciennes colonnes game si nécessaire
-- ALTER TABLE games
--   ADD COLUMN IF NOT EXISTS current_phase_id UUID,
--   ADD COLUMN IF NOT EXISTS current_turn_player_id UUID,
--   ADD COLUMN IF NOT EXISTS current_turn_guest_id TEXT;

-- ============================================================================
-- FIN ROLLBACK
-- ============================================================================

SELECT 'Rollback v2 terminé - Base de données nettoyée' as status;
