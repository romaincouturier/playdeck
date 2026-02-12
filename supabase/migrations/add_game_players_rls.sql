-- ============================================================================
-- ADD RLS POLICIES FOR game_players
-- ============================================================================
-- Problem: game_players table has no RLS policies
-- Guests cannot read game_players table, causing lobby crashes
-- ============================================================================

-- Enable RLS on game_players
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- Policy: Players can view other players in their games
DROP POLICY IF EXISTS "Players can view players in their games" ON game_players;
CREATE POLICY "Players can view players in their games"
  ON game_players FOR SELECT
  USING (
    -- Use helper function to avoid infinite recursion
    is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true))
  );

-- Policy: Authenticated users can insert themselves as players
DROP POLICY IF EXISTS "Users can join games" ON game_players;
CREATE POLICY "Users can join games"
  ON game_players FOR INSERT
  WITH CHECK (
    -- Must be inserting themselves (either as user or guest)
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (guest_session_id = current_setting('app.guest_session_id', true))
  );

-- Policy: Players can update their own player record
DROP POLICY IF EXISTS "Players can update own record" ON game_players;
CREATE POLICY "Players can update own record"
  ON game_players FOR UPDATE
  USING (
    user_id = auth.uid()
    OR guest_session_id = current_setting('app.guest_session_id', true)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR guest_session_id = current_setting('app.guest_session_id', true)
  );

-- Policy: Game master can manage all players in their games
DROP POLICY IF EXISTS "Game master can manage players" ON game_players;
CREATE POLICY "Game master can manage players"
  ON game_players FOR ALL
  USING (is_game_master(game_id, auth.uid()))
  WITH CHECK (is_game_master(game_id, auth.uid()));

-- ============================================================================
-- ADD RLS POLICIES FOR game_cards
-- ============================================================================

-- Enable RLS on game_cards
ALTER TABLE game_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Players can view cards in their games (respecting zone visibility)
DROP POLICY IF EXISTS "Players can view cards in their games" ON game_cards;
CREATE POLICY "Players can view cards in their games"
  ON game_cards FOR SELECT
  USING (
    -- Must be in the game
    is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true))
    -- Zone visibility is handled at application level
    -- RLS just ensures player is in the game
  );

-- Policy: Players and GM can modify cards in their games
DROP POLICY IF EXISTS "Players can modify cards in their games" ON game_cards;
CREATE POLICY "Players can modify cards in their games"
  ON game_cards FOR ALL
  USING (
    is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true))
    OR is_game_master(game_id, auth.uid())
  )
  WITH CHECK (
    is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true))
    OR is_game_master(game_id, auth.uid())
  );

-- ============================================================================
-- RAPPORT
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================';
  RAISE NOTICE 'GAME_PLAYERS & GAME_CARDS RLS';
  RAISE NOTICE '============================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS enabled on game_players';
  RAISE NOTICE '   - 4 policies created';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS enabled on game_cards';
  RAISE NOTICE '   - 2 policies created';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Guests can now access game lobbies!';
  RAISE NOTICE '';
END $$;
