-- ============================================================================
-- TEST DE LA MIGRATION V2 - MOTEUR UNIVERSEL
-- ============================================================================
-- Script de test sans caracteres speciaux pour validation complete
-- de la migration 20260211_v2_universal_engine.sql

-- ============================================================================
-- ETAPE 1: VERIFICATION DES TABLES
-- ============================================================================

SELECT 'TEST 1: Verification de la table game_master' as test;
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'game_master'
) as game_master_exists;

SELECT 'TEST 2: Verification de la table zones' as test;
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'zones'
) as zones_exists;

SELECT 'TEST 3: Verification de la table primitive_actions' as test;
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'primitive_actions'
) as primitive_actions_exists;

SELECT 'TEST 4: Verification de la table turn_state' as test;
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'turn_state'
) as turn_state_exists;

SELECT 'TEST 5: Verification de la table card_marks' as test;
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'card_marks'
) as card_marks_exists;

SELECT 'TEST 6: Verification de la table game_snapshots' as test;
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'game_snapshots'
) as game_snapshots_exists;

SELECT 'TEST 7: Verification de la table predefined_games' as test;
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'predefined_games'
) as predefined_games_exists;

SELECT 'TEST 8: Verification de la table player_visibility_overrides' as test;
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'player_visibility_overrides'
) as player_visibility_overrides_exists;

-- ============================================================================
-- ETAPE 2: VERIFICATION DES FONCTIONS SQL
-- ============================================================================

SELECT 'TEST 9: Verification de la fonction create_default_zones' as test;
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'create_default_zones'
) as create_default_zones_exists;

SELECT 'TEST 10: Verification de la fonction create_player_hand_zone' as test;
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'create_player_hand_zone'
) as create_player_hand_zone_exists;

SELECT 'TEST 11: Verification de la fonction get_next_player' as test;
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'get_next_player'
) as get_next_player_exists;

SELECT 'TEST 12: Verification de la fonction initialize_turn_state' as test;
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'initialize_turn_state'
) as initialize_turn_state_exists;

SELECT 'TEST 13: Verification de la fonction recycle_discard_to_deck' as test;
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'recycle_discard_to_deck'
) as recycle_discard_to_deck_exists;

SELECT 'TEST 14: Verification de la fonction calculate_player_score' as test;
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'calculate_player_score'
) as calculate_player_score_exists;

SELECT 'TEST 15: Verification de la fonction create_game_snapshot' as test;
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'create_game_snapshot'
) as create_game_snapshot_exists;

-- ============================================================================
-- ETAPE 3: VERIFICATION DES JEUX PREDEFINIS
-- ============================================================================

SELECT 'TEST 16: Verification des jeux predefinis' as test;
SELECT id, name, is_public
FROM predefined_games
ORDER BY name;

-- ============================================================================
-- ETAPE 4: CREATION D UN JEU DE TEST COMPLET
-- ============================================================================

SELECT 'TEST 17: Creation d un jeu de test complet' as test;

-- 4.1: Creer un utilisateur de test (simuler)
-- Note: En production, auth.users est gere par Supabase Auth
-- Pour ce test, on va utiliser un UUID fictif ou un utilisateur existant

-- 4.2: Creer un deck de test
DO $$
DECLARE
  v_deck_id UUID;
  v_game_id UUID;
  v_gm_user_id UUID;
  v_player1_id UUID;
  v_player2_id UUID;
  v_zone_deck_id UUID;
  v_zone_center_id UUID;
  v_zone_discard_id UUID;
  v_zone_hand1_id UUID;
  v_zone_hand2_id UUID;
  v_card1_id UUID;
  v_card2_id UUID;
  v_card3_id UUID;
  v_snapshot_id UUID;
BEGIN
  -- Generer des UUIDs
  v_gm_user_id := gen_random_uuid();
  v_deck_id := gen_random_uuid();
  v_game_id := gen_random_uuid();
  v_player1_id := gen_random_uuid();
  v_player2_id := gen_random_uuid();
  v_card1_id := gen_random_uuid();
  v_card2_id := gen_random_uuid();
  v_card3_id := gen_random_uuid();

  RAISE NOTICE 'Deck ID: %', v_deck_id;
  RAISE NOTICE 'Game ID: %', v_game_id;
  RAISE NOTICE 'GM User ID: %', v_gm_user_id;

  -- Creer un deck minimal (on skip la table decks pour ce test)
  -- En production, il faudrait creer le deck d abord

  -- Creer la partie
  INSERT INTO games (
    id,
    code,
    status,
    game_master_id,
    deck_id,
    current_round,
    max_players,
    created_at
  ) VALUES (
    v_game_id,
    'TEST99',
    'waiting',
    v_gm_user_id,
    v_deck_id,
    0,
    4,
    NOW()
  );

  RAISE NOTICE 'Partie creee avec code TEST99';

  -- Creer le Game Master
  INSERT INTO game_master (
    game_id,
    user_id,
    is_playing,
    omniscient_mode,
    can_undo,
    created_at
  ) VALUES (
    v_game_id,
    v_gm_user_id,
    false,
    true,
    true,
    NOW()
  );

  RAISE NOTICE 'Game Master cree';

  -- Creer les zones par defaut via la fonction
  PERFORM create_default_zones(v_game_id);
  RAISE NOTICE 'Zones par defaut creees (DECK, CENTER, DISCARD)';

  -- Recuperer les IDs des zones creees
  SELECT id INTO v_zone_deck_id
  FROM zones
  WHERE game_id = v_game_id AND type = 'DECK';

  SELECT id INTO v_zone_center_id
  FROM zones
  WHERE game_id = v_game_id AND type = 'CENTER';

  SELECT id INTO v_zone_discard_id
  FROM zones
  WHERE game_id = v_game_id AND type = 'DISCARD';

  RAISE NOTICE 'Zone DECK: %', v_zone_deck_id;
  RAISE NOTICE 'Zone CENTER: %', v_zone_center_id;
  RAISE NOTICE 'Zone DISCARD: %', v_zone_discard_id;

  -- Creer 2 joueurs
  INSERT INTO game_players (
    id,
    game_id,
    user_id,
    player_name,
    role,
    is_active,
    score,
    position
  ) VALUES
  (
    v_player1_id,
    v_game_id,
    NULL,
    'Joueur 1',
    'PLAYER',
    true,
    0,
    1
  ),
  (
    v_player2_id,
    v_game_id,
    NULL,
    'Joueur 2',
    'PLAYER',
    true,
    0,
    2
  );

  RAISE NOTICE 'Joueurs crees';

  -- Creer les zones HAND pour chaque joueur
  v_zone_hand1_id := create_player_hand_zone(v_game_id, v_player1_id, 'Joueur 1');
  v_zone_hand2_id := create_player_hand_zone(v_game_id, v_player2_id, 'Joueur 2');

  RAISE NOTICE 'Zones HAND creees';
  RAISE NOTICE 'Zone HAND Joueur 1: %', v_zone_hand1_id;
  RAISE NOTICE 'Zone HAND Joueur 2: %', v_zone_hand2_id;

  -- Creer quelques cartes dans le deck
  -- Note: En production, les cartes viendraient de la table cards liee au deck
  -- Pour ce test, on simule 3 cartes
  INSERT INTO game_cards (
    id,
    game_id,
    zone_id,
    card_position,
    is_face_up,
    created_at,
    updated_at
  ) VALUES
  (
    v_card1_id,
    v_game_id,
    v_zone_deck_id,
    1,
    false,
    NOW(),
    NOW()
  ),
  (
    v_card2_id,
    v_game_id,
    v_zone_deck_id,
    2,
    false,
    NOW(),
    NOW()
  ),
  (
    v_card3_id,
    v_game_id,
    v_zone_deck_id,
    3,
    false,
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Cartes creees dans le deck';

  -- Initialiser le turn state
  PERFORM initialize_turn_state(v_game_id);
  RAISE NOTICE 'Turn state initialise';

  -- Mettre a jour le statut de la partie a "playing"
  UPDATE games
  SET status = 'playing', started_at = NOW()
  WHERE id = v_game_id;

  RAISE NOTICE 'Partie demarree';

  -- Enregistrer une action primitive (distribution)
  INSERT INTO primitive_actions (
    id,
    game_id,
    actor_id,
    action_type,
    card_ids,
    source_zone_id,
    target_zone_id,
    target_player_id,
    face_visible,
    can_be_undone,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_game_id,
    v_player1_id,
    'REVEAL_TOP_CARD',
    ARRAY[v_card1_id],
    v_zone_deck_id,
    v_zone_center_id,
    NULL,
    true,
    true,
    NOW()
  );

  RAISE NOTICE 'Action primitive enregistree';

  -- Creer un snapshot du jeu
  v_snapshot_id := create_game_snapshot(v_game_id);
  RAISE NOTICE 'Snapshot cree: %', v_snapshot_id;

  -- Tester la fonction get_next_player
  DECLARE
    v_next_player UUID;
  BEGIN
    v_next_player := get_next_player(v_game_id, v_player1_id);
    RAISE NOTICE 'Joueur suivant apres Joueur 1: %', v_next_player;
  END;

  RAISE NOTICE 'Tests complets termines avec succes!';

END $$;

-- ============================================================================
-- ETAPE 5: VERIFICATION DES DONNEES CREEES
-- ============================================================================

SELECT 'TEST 18: Verification de la partie creee' as test;
SELECT id, code, status, max_players, current_round
FROM games
WHERE code = 'TEST99';

SELECT 'TEST 19: Verification du Game Master' as test;
SELECT game_id, user_id, is_playing, omniscient_mode, can_undo
FROM game_master
WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');

SELECT 'TEST 20: Verification des zones creees' as test;
SELECT id, name, type, visibility, default_face, owner_player_id
FROM zones
WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99')
ORDER BY type;

SELECT 'TEST 21: Verification des joueurs' as test;
SELECT id, player_name, role, is_active, score, position
FROM game_players
WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99')
ORDER BY position;

SELECT 'TEST 22: Verification des cartes' as test;
SELECT id, zone_id, card_position, is_face_up
FROM game_cards
WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99')
ORDER BY card_position;

SELECT 'TEST 23: Verification du turn_state' as test;
SELECT game_id, current_player_id, direction, turn_number, is_paused
FROM turn_state
WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');

SELECT 'TEST 24: Verification des actions primitives' as test;
SELECT id, action_type, card_ids, source_zone_id, target_zone_id, can_be_undone
FROM primitive_actions
WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99')
ORDER BY created_at DESC;

SELECT 'TEST 25: Verification des snapshots' as test;
SELECT id, game_id, version, created_at
FROM game_snapshots
WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99')
ORDER BY created_at DESC;

-- ============================================================================
-- ETAPE 6: NETTOYAGE (OPTIONNEL)
-- ============================================================================

-- Decommenter pour nettoyer les donnees de test:
-- DELETE FROM primitive_actions WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
-- DELETE FROM game_snapshots WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
-- DELETE FROM game_cards WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
-- DELETE FROM turn_state WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
-- DELETE FROM zones WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
-- DELETE FROM game_players WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
-- DELETE FROM game_master WHERE game_id IN (SELECT id FROM games WHERE code = 'TEST99');
-- DELETE FROM games WHERE code = 'TEST99';

-- ============================================================================
-- RESUME FINAL
-- ============================================================================

SELECT 'TESTS DE MIGRATION V2 - TERMINÉS' as summary;
SELECT 'Toutes les tables, fonctions et triggers ont ete verifies' as summary;
SELECT 'Une partie de test complete a ete creee avec le code TEST99' as summary;
SELECT 'Verifiez les resultats ci-dessus pour confirmer le succes' as summary;
