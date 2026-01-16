-- Create Planning Poker Template
-- This script creates a standard Planning Poker deck with Fibonacci sequence

DO $$
DECLARE
    new_deck_id UUID := uuid_generate_v4();
    owner_id UUID;
    type_0_id UUID;
    type_1_id UUID;
    type_2_id UUID;
    type_3_id UUID;
    type_5_id UUID;
    type_8_id UUID;
    type_13_id UUID;
    type_20_id UUID;
    type_40_id UUID;
    type_100_id UUID;
    type_ques_id UUID;
    type_coffee_id UUID;
    hand_zone_id UUID := uuid_generate_v4();
    vote_zone_id UUID := uuid_generate_v4();
BEGIN
    -- Get an owner ID (first admin or user found)
    SELECT id INTO owner_id FROM auth.users LIMIT 1;
    
    IF owner_id IS NULL THEN
        RAISE EXCEPTION 'No user found in auth.users. Please sign up first.';
    END IF;

    -- 1. Create the Deck
    INSERT INTO public.decks (id, name, description, user_id, game_mode, min_players, max_players, settings, turn_structure)
    VALUES (
        new_deck_id, 
        'Planning Poker Fibonacci', 
        'Standard Fibonacci sequence for agile estimation.', 
        owner_id, 
        'COOPERATIVE', 
        2, 10,
        '{"initial_distribution": {"cards_per_player": 0, "distribution_mode": "ALL_SAME"}, "show_card_count": true, "show_discard_pile": false, "allow_chat": true, "allow_reactions": true, "hints_enabled": true, "rules_reference_accessible": true}'::jsonb,
        '{"turn_order": "CLOCKWISE", "phases": [{"id": "voting", "name": "Vote", "allowed_actions": ["PLAY_CARD", "REVEAL_ALL"], "auto_pass": false}, {"id": "reveal", "name": "Reveal", "allowed_actions": ["PASS_TURN"], "auto_pass": true}]}'::jsonb
    );

    -- 2. Create Card Types
    INSERT INTO public.card_types (deck_id, name, properties) VALUES
        (new_deck_id, '0', '{"weight": 1, "value": 0}'::jsonb) RETURNING id INTO type_0_id;
    INSERT INTO public.card_types (deck_id, name, properties) VALUES
        (new_deck_id, '1', '{"weight": 1, "value": 1}'::jsonb) RETURNING id INTO type_1_id;
    INSERT INTO public.card_types (deck_id, name, properties) VALUES
        (new_deck_id, '2', '{"weight": 1, "value": 2}'::jsonb) RETURNING id INTO type_2_id;
    INSERT INTO public.card_types (deck_id, name, properties) VALUES
        (new_deck_id, '3', '{"weight": 1, "value": 3}'::jsonb) RETURNING id INTO type_3_id;
    INSERT INTO public.card_types (deck_id, name, properties) VALUES
        (new_deck_id, '5', '{"weight": 1, "value": 5}'::jsonb) RETURNING id INTO type_5_id;
    INSERT INTO public.card_types (deck_id, name, properties) VALUES
        (new_deck_id, '8', '{"weight": 1, "value": 8}'::jsonb) RETURNING id INTO type_8_id;
    INSERT INTO public.card_types (deck_id, name, properties) VALUES
        (new_deck_id, '13', '{"weight": 1, "value": 13}'::jsonb) RETURNING id INTO type_13_id;
    INSERT INTO public.card_types (deck_id, name, properties) VALUES
        (new_deck_id, '20', '{"weight": 1, "value": 20}'::jsonb) RETURNING id INTO type_20_id;
    INSERT INTO public.card_types (deck_id, name, properties) VALUES
        (new_deck_id, '40', '{"weight": 1, "value": 40}'::jsonb) RETURNING id INTO type_40_id;
    INSERT INTO public.card_types (deck_id, name, properties) VALUES
        (new_deck_id, '100', '{"weight": 1, "value": 100}'::jsonb) RETURNING id INTO type_100_id;
    INSERT INTO public.card_types (deck_id, name, properties) VALUES
        (new_deck_id, '?', '{"weight": 1, "special": "question"}'::jsonb) RETURNING id INTO type_ques_id;
    INSERT INTO public.card_types (deck_id, name, properties) VALUES
        (new_deck_id, 'Coffee', '{"weight": 1, "special": "coffee"}'::jsonb) RETURNING id INTO type_coffee_id;

    -- 3. Create Cards (one of each for testing, in a real scenario we'd create batches per player)
    -- Actually, Planning Poker decks should have one set of these per max_player.
    -- For simplicity in seed, let's just create one set of 12 cards.
    -- In a real game, the app would handle distributing these or we create more.
    -- For now let's create 12 cards (one of each type) with a dummy image and positions.
    INSERT INTO public.cards (deck_id, type_id, image_url, position) VALUES 
        (new_deck_id, type_0_id, 'https://placehold.co/400x600?text=0', 0),
        (new_deck_id, type_1_id, 'https://placehold.co/400x600?text=1', 1),
        (new_deck_id, type_2_id, 'https://placehold.co/400x600?text=2', 2),
        (new_deck_id, type_3_id, 'https://placehold.co/400x600?text=3', 3),
        (new_deck_id, type_5_id, 'https://placehold.co/400x600?text=5', 4),
        (new_deck_id, type_8_id, 'https://placehold.co/400x600?text=8', 5),
        (new_deck_id, type_13_id, 'https://placehold.co/400x600?text=13', 6),
        (new_deck_id, type_20_id, 'https://placehold.co/400x600?text=20', 7),
        (new_deck_id, type_40_id, 'https://placehold.co/400x600?text=40', 8),
        (new_deck_id, type_100_id, 'https://placehold.co/400x600?text=100', 9),
        (new_deck_id, type_ques_id, 'https://placehold.co/400x600?text=?', 10),
        (new_deck_id, type_coffee_id, 'https://placehold.co/400x600?text=Coffee', 11);

    -- 4. Create Zones
    -- Player Hand
    INSERT INTO public.zones (id, deck_id, name, type, scope, visibility)
    VALUES (hand_zone_id, new_deck_id, 'Ma main', 'HAND', 'PLAYER', 'OWNER');
    
    -- Table (Voting Area)
    INSERT INTO public.zones (id, deck_id, name, type, scope, visibility)
    VALUES (vote_zone_id, new_deck_id, 'Table de vote', 'PLAY_AREA', 'GLOBAL', 'HIDDEN');

    -- 5. Create Rules
    INSERT INTO public.game_rules (deck_id, name, mechanic_type, trigger_event, action_type)
    VALUES (new_deck_id, 'Jouer son vote', 'PLAY', 'ON_PLAY', 'PLAY_CARD');

    RAISE NOTICE 'Planning Poker deck created with ID: %', new_deck_id;
END $$;
