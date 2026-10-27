-- ============================================================================
-- Migration 009: P1 Advanced Features
-- ============================================================================
-- This migration adds database support for P1 primitives:
-- - Card Grouping (GROUP_CARDS, UNGROUP_CARDS)
-- - Selective Reveal (REVEAL_TO_PLAYER, SHOW_HAND_TO_PLAYER)
-- - Game Pause (PAUSE_GAME, RESUME_GAME)
-- - Action History (UNDO_ACTION)
-- - Winner Tracking (DECLARE_GAME_WINNER)
-- ============================================================================

-- ============================================================================
-- 1. CARD GROUPING P1
-- ============================================================================

-- Add grouping columns to game_cards
ALTER TABLE game_cards ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE game_cards ADD COLUMN IF NOT EXISTS group_name TEXT;

COMMENT ON COLUMN game_cards.group_id IS 'P1: Group ID for grouped cards (GROUP_CARDS primitive)';
COMMENT ON COLUMN game_cards.group_name IS 'P1: Display name of the card group';

-- Index for group queries
CREATE INDEX IF NOT EXISTS idx_game_cards_group_id
  ON game_cards(group_id)
  WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_game_cards_group_name
  ON game_cards(game_id, group_name)
  WHERE group_name IS NOT NULL;

-- ============================================================================
-- 2. SELECTIVE REVEAL P1
-- ============================================================================

-- Add revealed_to array to game_cards for selective visibility
ALTER TABLE game_cards ADD COLUMN IF NOT EXISTS revealed_to TEXT[] DEFAULT '{}';

COMMENT ON COLUMN game_cards.revealed_to IS 'P1: Array of player IDs who can see this card (REVEAL_TO_PLAYER)';

-- GIN index for array containment queries
CREATE INDEX IF NOT EXISTS idx_game_cards_revealed_to
  ON game_cards USING GIN (revealed_to);

-- ============================================================================
-- 3. GAME PAUSE P1
-- ============================================================================

-- Add pause-related columns to games
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;
ALTER TABLE games ADD COLUMN IF NOT EXISTS paused_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN games.is_paused IS 'P1: Whether the game is currently paused (PAUSE_GAME)';
COMMENT ON COLUMN games.paused_at IS 'P1: Timestamp when the game was paused';
COMMENT ON COLUMN games.paused_by IS 'P1: User ID who paused the game';

-- Index for paused games queries
CREATE INDEX IF NOT EXISTS idx_games_paused
  ON games(is_paused, paused_at)
  WHERE is_paused = TRUE;

-- ============================================================================
-- 4. WINNER TRACKING
-- ============================================================================

-- Add winner_id to games (mentioned in TODO comments)
ALTER TABLE games ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES game_players(id) ON DELETE SET NULL;

COMMENT ON COLUMN games.winner_id IS 'P0: Game player ID who won the game (DECLARE_GAME_WINNER)';

-- Index for winner queries
CREATE INDEX IF NOT EXISTS idx_games_winner_id ON games(winner_id);

-- ============================================================================
-- 5. PRIMITIVE ACTIONS LOG P1 (for UNDO_ACTION)
-- ============================================================================

-- Create table to log all primitive actions for undo functionality
CREATE TABLE IF NOT EXISTS primitive_actions_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_params JSONB NOT NULL,
  before_state JSONB,
  after_state JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_guest_session TEXT,
  can_be_undone BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE primitive_actions_log IS 'P1: Log of all primitive actions for UNDO_ACTION and analytics';
COMMENT ON COLUMN primitive_actions_log.action_type IS 'Primitive action name (e.g., DRAW_CARD, PLAY_TO_CENTER)';
COMMENT ON COLUMN primitive_actions_log.action_params IS 'Parameters passed to the action';
COMMENT ON COLUMN primitive_actions_log.before_state IS 'Relevant state before action (for undo)';
COMMENT ON COLUMN primitive_actions_log.after_state IS 'Relevant state after action (for undo)';
COMMENT ON COLUMN primitive_actions_log.can_be_undone IS 'Whether this action can be reversed (e.g., SHUFFLE cannot)';

-- Indexes for action log queries
CREATE INDEX IF NOT EXISTS idx_primitive_actions_log_game_id
  ON primitive_actions_log(game_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_primitive_actions_log_action_type
  ON primitive_actions_log(action_type);

CREATE INDEX IF NOT EXISTS idx_primitive_actions_log_performed_by
  ON primitive_actions_log(performed_by);

CREATE INDEX IF NOT EXISTS idx_primitive_actions_log_can_undo
  ON primitive_actions_log(game_id, can_be_undone, created_at DESC)
  WHERE can_be_undone = TRUE;

-- Partial index for recent undoable actions (last 24h)
CREATE INDEX IF NOT EXISTS idx_primitive_actions_log_recent_undoable
  ON primitive_actions_log(game_id, created_at DESC)
  WHERE can_be_undone = TRUE
    AND created_at > NOW() - INTERVAL '24 hours';

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- RLS for primitive_actions_log
ALTER TABLE primitive_actions_log ENABLE ROW LEVEL SECURITY;

-- Policy: Players can view actions from their games
CREATE POLICY "Players can view actions from their games"
  ON primitive_actions_log
  FOR SELECT
  USING (
    game_id IN (
      SELECT game_id FROM game_players
      WHERE user_id = auth.uid() OR guest_session_id = auth.uid()::text
    )
  );

-- Policy: System can insert actions (SECURITY DEFINER functions will handle this)
CREATE POLICY "System can insert actions"
  ON primitive_actions_log
  FOR INSERT
  WITH CHECK (true); -- Will be restricted by application logic

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to log a primitive action
CREATE OR REPLACE FUNCTION log_primitive_action(
  p_game_id UUID,
  p_action_type TEXT,
  p_action_params JSONB,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_can_be_undone BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_guest_session TEXT;
BEGIN
  -- Get current user/guest
  v_user_id := auth.uid();
  v_guest_session := current_setting('request.jwt.claims', true)::json->>'guest_session_id';

  -- Insert log entry
  INSERT INTO primitive_actions_log (
    game_id,
    action_type,
    action_params,
    before_state,
    after_state,
    performed_by,
    performed_by_guest_session,
    can_be_undone
  ) VALUES (
    p_game_id,
    p_action_type,
    p_action_params,
    p_before_state,
    p_after_state,
    v_user_id,
    v_guest_session,
    p_can_be_undone
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_primitive_action IS 'P1: Helper to log primitive actions for UNDO and analytics';

-- Function to get last undoable action for a game
CREATE OR REPLACE FUNCTION get_last_undoable_action(p_game_id UUID)
RETURNS TABLE (
  id UUID,
  action_type TEXT,
  action_params JSONB,
  before_state JSONB,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pal.id,
    pal.action_type,
    pal.action_params,
    pal.before_state,
    pal.created_at
  FROM primitive_actions_log pal
  WHERE pal.game_id = p_game_id
    AND pal.can_be_undone = TRUE
  ORDER BY pal.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_last_undoable_action IS 'P1: Get the most recent undoable action for UNDO_ACTION';

-- Function to cleanup old action logs (keep last 1000 per game)
CREATE OR REPLACE FUNCTION cleanup_old_action_logs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM primitive_actions_log
  WHERE game_id = NEW.game_id
    AND id NOT IN (
      SELECT id FROM primitive_actions_log
      WHERE game_id = NEW.game_id
      ORDER BY created_at DESC
      LIMIT 1000
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-cleanup on new action log insert
DROP TRIGGER IF EXISTS trigger_cleanup_old_action_logs ON primitive_actions_log;
CREATE TRIGGER trigger_cleanup_old_action_logs
  AFTER INSERT ON primitive_actions_log
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_action_logs();

-- ============================================================================
-- 8. UTILITY VIEWS
-- ============================================================================

-- View for recent actions per game (useful for analytics)
CREATE OR REPLACE VIEW recent_game_actions AS
SELECT
  game_id,
  action_type,
  COUNT(*) as action_count,
  MAX(created_at) as last_used_at
FROM primitive_actions_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY game_id, action_type;

COMMENT ON VIEW recent_game_actions IS 'Analytics: Recent action counts per game (last 7 days)';

-- View for most used primitives overall
CREATE OR REPLACE VIEW primitive_usage_stats AS
SELECT
  action_type,
  COUNT(*) as total_uses,
  COUNT(DISTINCT game_id) as games_count,
  MAX(created_at) as last_used_at
FROM primitive_actions_log
GROUP BY action_type
ORDER BY total_uses DESC;

COMMENT ON VIEW primitive_usage_stats IS 'Analytics: Overall primitive usage statistics';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
