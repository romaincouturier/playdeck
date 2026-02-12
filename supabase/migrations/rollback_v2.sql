-- ============================================================================
-- ROLLBACK MIGRATION V2 - NETTOYAGE COMPLET
-- ============================================================================
-- Ce script supprime toutes les tables et fonctions créées par la migration v2
-- ATTENTION: Cela supprimera toutes les données de test !

-- ============================================================================
-- 1. SUPPRIMER LES DONNÉES DE TEST
-- ============================================================================

-- Supprimer les jeux de test
DELETE FROM games WHERE code = 'TEST99';

-- ============================================================================
-- 2. SUPPRIMER LES TABLES V2 (dans l'ordre inverse des dépendances)
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

-- ============================================================================
-- 4. RESTAURER LES COLONNES GAMES (optionnel)
-- ============================================================================

-- Supprimer colonnes v2
ALTER TABLE games
  DROP COLUMN IF EXISTS game_master_id,
  DROP COLUMN IF EXISTS current_round,
  DROP COLUMN IF EXISTS game_mode;

-- Restaurer colonne host_id (si vous voulez revenir à v1)
-- ALTER TABLE games ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES auth.users(id);

-- ============================================================================
-- 5. SUPPRIMER COLONNES AJOUTÉES
-- ============================================================================

-- game_players
ALTER TABLE game_players
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS score;

-- game_cards
ALTER TABLE game_cards
  DROP COLUMN IF EXISTS card_position;

-- cards
ALTER TABLE cards
  DROP COLUMN IF EXISTS numeric_values;

-- ============================================================================
-- FIN ROLLBACK
-- ============================================================================

SELECT 'Rollback v2 complete - Base de donnees nettoyee' as status;
