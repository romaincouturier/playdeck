-- Migration: Add engine tables and columns

-- 1. Update decks table
ALTER TABLE public.decks 
ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'TURN_BASED',
ADD COLUMN IF NOT EXISTS min_players INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "initial_distribution": {"cards_per_player": 5, "distribution_mode": "ALL_SAME"},
  "show_card_count": true,
  "show_discard_pile": true,
  "allow_chat": true,
  "allow_reactions": true,
  "hints_enabled": false,
  "rules_reference_accessible": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS turn_structure JSONB DEFAULT '{
  "turn_order": "CLOCKWISE",
  "phases": [{"id": "main", "name": "Main Phase", "allowed_actions": ["DRAW_CARDS", "PLAY_CARD", "PASS_TURN"], "auto_pass": false}]
}'::jsonb;

-- 2. Create card_types table
CREATE TABLE IF NOT EXISTS public.card_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create zones table
CREATE TABLE IF NOT EXISTS public.zones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- DECK, HAND, PLAY_AREA, DISCARD, SHARED, PRIVATE
    visibility TEXT NOT NULL, -- PUBLIC, PRIVATE, OWNER_ONLY
    max_cards INTEGER,
    min_cards INTEGER,
    can_view TEXT DEFAULT 'ALL',
    can_draw TEXT DEFAULT 'TURN_PLAYER',
    can_play_to TEXT DEFAULT 'TURN_PLAYER',
    is_ordered BOOLEAN DEFAULT false,
    shuffle_on_init BOOLEAN DEFAULT false,
    scope TEXT DEFAULT 'GLOBAL', -- PLAYER, GLOBAL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create game_rules table
CREATE TABLE IF NOT EXISTS public.game_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mechanic_type TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    trigger_condition TEXT,
    action_type TEXT NOT NULL,
    action_parameters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add type_id to cards table
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES public.card_types(id);

-- 6. Update games table
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS current_turn_player_id_new TEXT,
ADD COLUMN IF NOT EXISTS current_phase_id TEXT DEFAULT 'main',
ADD COLUMN IF NOT EXISTS victory_conditions JSONB DEFAULT '[]'::jsonb;

-- Migration of turn player ID to a more flexible format (supporting guests)
-- We'll use a new column to avoid breaking existing data immediately if possible, 
-- or just allow NULL in the existing one and use a separate one for guests.
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS current_turn_guest_id TEXT;

-- 7. Add RLS policies for new tables
ALTER TABLE public.card_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rules ENABLE ROW LEVEL SECURITY;

-- card_types
CREATE POLICY "Public card types are viewable by everyone" ON public.card_types
    FOR SELECT USING (true);
CREATE POLICY "Users can manage their card types" ON public.card_types
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.decks WHERE decks.id = card_types.deck_id AND decks.user_id = auth.uid())
    );

-- zones
CREATE POLICY "Public zones are viewable by everyone" ON public.zones
    FOR SELECT USING (true);
CREATE POLICY "Users can manage their zones" ON public.zones
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.decks WHERE decks.id = zones.deck_id AND decks.user_id = auth.uid())
    );

-- game_rules
CREATE POLICY "Public game rules are viewable by everyone" ON public.game_rules
    FOR SELECT USING (true);
CREATE POLICY "Users can manage their game rules" ON public.game_rules
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.decks WHERE decks.id = game_rules.deck_id AND decks.user_id = auth.uid())
    );
