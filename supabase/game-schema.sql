-- ============================================
-- SCHÉMA POUR LE JEU MULTIJOUEUR (ÉTAPE 2)
-- ============================================

-- Table games : représente une partie
CREATE TABLE IF NOT EXISTS public.games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL, -- Code à 6 caractères pour rejoindre
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, playing, finished
  max_players INTEGER NOT NULL DEFAULT 4,
  current_turn_player_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_status CHECK (status IN ('waiting', 'playing', 'finished')),
  CONSTRAINT valid_max_players CHECK (max_players >= 2 AND max_players <= 6)
);

-- Table game_players : joueurs dans une partie
CREATE TABLE IF NOT EXISTS public.game_players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_order INTEGER NOT NULL, -- Ordre de jeu (0, 1, 2, ...)
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(game_id, user_id),
  UNIQUE(game_id, player_order)
);

-- Table game_cards : cartes dans le jeu (main, pioche, défausse)
CREATE TABLE IF NOT EXISTS public.game_cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  location TEXT NOT NULL, -- 'deck' (pioche), 'hand', 'discard'
  owner_user_id UUID REFERENCES auth.users(id), -- NULL si dans pioche/défausse
  position INTEGER NOT NULL, -- Position dans la pile/main
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_location CHECK (location IN ('deck', 'hand', 'discard'))
);

-- Indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_games_code ON public.games(code);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_games_host_id ON public.games(host_id);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON public.game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON public.game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_game_id ON public.game_cards(game_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_location ON public.game_cards(game_id, location);
CREATE INDEX IF NOT EXISTS idx_game_cards_owner ON public.game_cards(game_id, owner_user_id);

-- Enable Row Level Security
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for games table
CREATE POLICY "Anyone can view games they're part of"
  ON public.games FOR SELECT
  USING (
    auth.uid() = host_id OR
    EXISTS (
      SELECT 1 FROM public.game_players
      WHERE game_players.game_id = games.id
      AND game_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create games"
  ON public.games FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update their games"
  ON public.games FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Host can delete their games"
  ON public.games FOR DELETE
  USING (auth.uid() = host_id);

-- RLS Policies for game_players table
CREATE POLICY "Players can view other players in their games"
  ON public.game_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_players AS gp
      WHERE gp.game_id = game_players.game_id
      AND gp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join games"
  ON public.game_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can leave games"
  ON public.game_players FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for game_cards table
CREATE POLICY "Players can view cards in their games"
  ON public.game_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_players
      WHERE game_players.game_id = game_cards.game_id
      AND game_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Game system can manage cards"
  ON public.game_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_players
      WHERE game_players.game_id = game_cards.game_id
      AND game_players.user_id = auth.uid()
    )
  );

CREATE POLICY "Game system can update cards"
  ON public.game_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.game_players
      WHERE game_players.game_id = game_cards.game_id
      AND game_players.user_id = auth.uid()
    )
  );

-- Fonction pour générer un code de partie unique
CREATE OR REPLACE FUNCTION generate_game_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sans lettres ambiguës
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour distribuer les cartes
CREATE OR REPLACE FUNCTION distribute_cards(p_game_id UUID, p_cards_per_player INTEGER DEFAULT 5)
RETURNS VOID AS $$
DECLARE
  v_card RECORD;
  v_player RECORD;
  v_position INTEGER := 0;
  v_player_position INTEGER;
BEGIN
  -- Mélanger et distribuer les cartes
  -- D'abord, créer la pioche avec toutes les cartes du deck
  INSERT INTO public.game_cards (game_id, card_id, location, position)
  SELECT
    p_game_id,
    cards.id,
    'deck',
    ROW_NUMBER() OVER (ORDER BY random())
  FROM public.cards
  INNER JOIN public.games ON games.deck_id = cards.deck_id
  WHERE games.id = p_game_id;

  -- Distribuer les cartes aux joueurs
  FOR v_player IN
    SELECT user_id, player_order
    FROM public.game_players
    WHERE game_id = p_game_id
    ORDER BY player_order
  LOOP
    v_player_position := 0;

    FOR v_card IN
      SELECT id
      FROM public.game_cards
      WHERE game_id = p_game_id
      AND location = 'deck'
      ORDER BY position
      LIMIT p_cards_per_player
    LOOP
      UPDATE public.game_cards
      SET
        location = 'hand',
        owner_user_id = v_player.user_id,
        position = v_player_position
      WHERE id = v_card.id;

      v_player_position := v_player_position + 1;
    END LOOP;
  END LOOP;

  -- Réorganiser les positions de la pioche
  UPDATE public.game_cards
  SET position = subquery.new_position
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 AS new_position
    FROM public.game_cards
    WHERE game_id = p_game_id AND location = 'deck'
  ) AS subquery
  WHERE game_cards.id = subquery.id;
END;
$$ LANGUAGE plpgsql;
