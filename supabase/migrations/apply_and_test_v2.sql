-- ============================================================================
-- SCRIPT COMPLET: MIGRATION V2 + TESTS
-- ============================================================================
-- Ce script applique d'abord la migration v2, puis execute les tests
-- A executer dans Supabase SQL Editor

-- ============================================================================
-- ETAPE 1: APPLIQUER LA MIGRATION V2
-- ============================================================================

\i 20260211_v2_universal_engine.sql

-- ============================================================================
-- ETAPE 2: VERIFIER QUE LA MIGRATION A REUSSI
-- ============================================================================

SELECT 'VERIFICATION POST-MIGRATION' as step;

-- Verifier que host_id a ete supprimee
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'games' AND column_name = 'host_id'
    ) THEN 'ERREUR: host_id existe toujours'
    ELSE 'OK: host_id supprimee'
  END as host_id_check;

-- Verifier que game_master_id a ete ajoutee
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'games' AND column_name = 'game_master_id'
    ) THEN 'OK: game_master_id existe'
    ELSE 'ERREUR: game_master_id manquante'
  END as game_master_id_check;

-- Verifier que les nouvelles tables existent
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'game_master') THEN 'OK'
    ELSE 'ERREUR'
  END as game_master_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'zones') THEN 'OK'
    ELSE 'ERREUR'
  END as zones_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'primitive_actions') THEN 'OK'
    ELSE 'ERREUR'
  END as primitive_actions_table,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'turn_state') THEN 'OK'
    ELSE 'ERREUR'
  END as turn_state_table;

-- ============================================================================
-- ETAPE 3: EXECUTER LES TESTS
-- ============================================================================

\i test_v2_migration.sql
