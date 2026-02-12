-- ============================================================================
-- ADD FUNCTION: initialize_game_cards
-- ============================================================================
-- Problem: When game starts, no cards exist in game_cards table
-- distribute_cards() fails because DECK zone is empty
-- Solution: Create game_cards from deck's cards when game starts
-- ============================================================================

-- Fonction: Initialiser les cartes d'une partie
DROP FUNCTION IF EXISTS initialize_game_cards(UUID);
CREATE OR REPLACE FUNCTION initialize_game_cards(p_game_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deck_id UUID;
  v_deck_zone_id UUID;
  v_card RECORD;
  v_position INTEGER := 0;
  v_cards_created INTEGER := 0;
BEGIN
  -- Récupérer le deck_id de la partie
  SELECT deck_id INTO v_deck_id
  FROM games
  WHERE id = p_game_id;

  -- Si pas de deck, on ne peut pas initialiser les cartes
  IF v_deck_id IS NULL THEN
    RAISE NOTICE 'No deck_id for game %, skipping card initialization', p_game_id;
    RETURN 0;
  END IF;

  -- Récupérer la zone DECK
  SELECT id INTO v_deck_zone_id
  FROM zones
  WHERE game_id = p_game_id AND type = 'DECK'
  LIMIT 1;

  IF v_deck_zone_id IS NULL THEN
    RAISE EXCEPTION 'DECK zone not found for game_id %', p_game_id;
  END IF;

  -- Créer une carte dans game_cards pour chaque carte du deck
  -- Mélange aléatoire avec ORDER BY RANDOM()
  FOR v_card IN
    SELECT id, deck_id
    FROM cards
    WHERE deck_id = v_deck_id
    ORDER BY RANDOM()  -- Mélange aléatoire dès l'insertion
  LOOP
    INSERT INTO game_cards (
      game_id,
      card_id,
      zone_id,
      owner_id,
      position,
      face_visible
    )
    VALUES (
      p_game_id,
      v_card.id,
      v_deck_zone_id,
      NULL,  -- Pas de propriétaire au départ
      v_position,
      false  -- Face cachée dans le deck
    );

    v_position := v_position + 1;
    v_cards_created := v_cards_created + 1;
  END LOOP;

  RAISE NOTICE 'Initialized % cards for game %', v_cards_created, p_game_id;
  RETURN v_cards_created;
END;
$$;

COMMENT ON FUNCTION initialize_game_cards IS 'Crée les game_cards depuis les cards du deck, dans la zone DECK, mélangées aléatoirement';

-- ============================================================================
-- UPDATE TRIGGER: Call initialize_game_cards when game starts
-- ============================================================================

-- Mettre à jour le trigger pour appeler initialize_game_cards
DROP FUNCTION IF EXISTS trigger_create_default_zones() CASCADE;
CREATE OR REPLACE FUNCTION trigger_create_default_zones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'playing' AND OLD.status = 'waiting' THEN
    -- 1. Créer les zones par défaut
    PERFORM create_default_zones(NEW.id);

    -- 2. Initialiser les cartes du deck
    PERFORM initialize_game_cards(NEW.id);

    -- 3. Initialiser turn_state
    PERFORM initialize_turn_state(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS on_game_start_create_zones ON games;
CREATE TRIGGER on_game_start_create_zones
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_zones();

-- ============================================================================
-- RAPPORT
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===============================';
  RAISE NOTICE 'INITIALIZE_GAME_CARDS ADDED';
  RAISE NOTICE '===============================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Function initialize_game_cards created';
  RAISE NOTICE '✅ Trigger updated to call initialize_game_cards';
  RAISE NOTICE '';
  RAISE NOTICE 'Flow when game starts:';
  RAISE NOTICE '  1. Create zones (DECK, CENTER, DISCARD)';
  RAISE NOTICE '  2. Initialize game_cards from deck → DECK zone';
  RAISE NOTICE '  3. Initialize turn_state';
  RAISE NOTICE '  4. distribute_cards can now work!';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Card distribution should work now!';
  RAISE NOTICE '';
END $$;
