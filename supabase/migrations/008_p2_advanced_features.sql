-- ============================================================================
-- Migration 008: P2 Advanced Features
-- ============================================================================
-- This migration adds database support for P2 primitives:
-- - Timer (START_TIMER, STOP_TIMER)
-- - Advanced Visibility (HIDE_OWN_CARDS, REVEAL_OWN_CARDS)
-- - Visual Marking (MARK_CARD, UNMARK_CARD)
-- - Save/Load Game (SAVE_GAME, LOAD_GAME)
-- - Predefined Games (LOAD_PREDEFINED_GAME)
-- ============================================================================

-- ============================================================================
-- 1. TIMER P2
-- ============================================================================

-- Add timer columns to turn_state for per-turn timers
ALTER TABLE turn_state ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMP;
ALTER TABLE turn_state ADD COLUMN IF NOT EXISTS timer_duration INTEGER; -- seconds

COMMENT ON COLUMN turn_state.timer_started_at IS 'Timestamp when the timer was started for this turn';
COMMENT ON COLUMN turn_state.timer_duration IS 'Timer duration in seconds';

-- Index for active timers queries
CREATE INDEX IF NOT EXISTS idx_turn_state_timer
  ON turn_state(timer_started_at)
  WHERE timer_started_at IS NOT NULL;

-- ============================================================================
-- 2. ADVANCED VISIBILITY P2
-- ============================================================================

-- Add cards_hidden flag to game_players
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS cards_hidden BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN game_players.cards_hidden IS 'P2: Whether this player''s cards are hidden (even from themselves)';

-- Index for queries filtering hidden cards
CREATE INDEX IF NOT EXISTS idx_game_players_cards_hidden
  ON game_players(game_id, cards_hidden)
  WHERE cards_hidden = TRUE;

-- ============================================================================
-- 3. VISUAL MARKING P2
-- ============================================================================

-- Add marks column to game_cards for visual markers
ALTER TABLE game_cards ADD COLUMN IF NOT EXISTS marks JSONB DEFAULT '[]';

COMMENT ON COLUMN game_cards.marks IS 'P2: Visual markers on this card (badges, colors, icons)';

-- GIN index for JSONB queries on marks
CREATE INDEX IF NOT EXISTS idx_game_cards_marks
  ON game_cards USING GIN (marks);

-- ============================================================================
-- 4. GAME SNAPSHOTS P2 (Save/Load)
-- ============================================================================

-- Create table for game state snapshots
CREATE TABLE IF NOT EXISTS game_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE game_snapshots IS 'P2: Saved game states for SAVE_GAME/LOAD_GAME primitives';
COMMENT ON COLUMN game_snapshots.snapshot_data IS 'Complete game state: game, cards, players, turns, zones';

-- Indexes for snapshot queries
CREATE INDEX IF NOT EXISTS idx_game_snapshots_game_id ON game_snapshots(game_id);
CREATE INDEX IF NOT EXISTS idx_game_snapshots_created_at ON game_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_snapshots_created_by ON game_snapshots(created_by);

-- RLS policies for game_snapshots
ALTER TABLE game_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view snapshots of games they're in
CREATE POLICY "Users can view snapshots of their games"
  ON game_snapshots
  FOR SELECT
  USING (
    game_id IN (
      SELECT game_id FROM game_players
      WHERE user_id = auth.uid() OR guest_session_id = auth.uid()::text
    )
  );

-- Policy: Game masters can create snapshots
CREATE POLICY "Game masters can create snapshots"
  ON game_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE id = game_id AND game_master_id = auth.uid()
    )
  );

-- Policy: Game masters can delete their snapshots
CREATE POLICY "Game masters can delete snapshots"
  ON game_snapshots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE id = game_id AND game_master_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. PREDEFINED GAMES P2
-- ============================================================================

-- Create table for predefined game templates
CREATE TABLE IF NOT EXISTS predefined_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  rules_text TEXT NOT NULL,
  victory_conditions JSONB NOT NULL,
  default_settings JSONB,
  default_zones JSONB,
  min_players INTEGER DEFAULT 2,
  max_players INTEGER DEFAULT 6,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE predefined_games IS 'P2: Predefined game templates (Poker, UNO, Belote, etc.)';
COMMENT ON COLUMN predefined_games.rules_text IS 'Game rules in Markdown format';
COMMENT ON COLUMN predefined_games.victory_conditions IS 'Victory conditions as JSONB array';
COMMENT ON COLUMN predefined_games.default_settings IS 'Default game settings to apply';
COMMENT ON COLUMN predefined_games.default_zones IS 'Default zones configuration';

-- Index for searching predefined games
CREATE INDEX IF NOT EXISTS idx_predefined_games_name ON predefined_games(name);

-- RLS for predefined_games (public read, admin write)
ALTER TABLE predefined_games ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view predefined games
CREATE POLICY "Anyone can view predefined games"
  ON predefined_games
  FOR SELECT
  USING (true);

-- Insert initial predefined games
INSERT INTO predefined_games (name, description, rules_text, victory_conditions, min_players, max_players) VALUES
  (
    'Poker',
    'Texas Hold''em Poker - Le jeu de poker le plus populaire au monde',
    E'# Règles du Poker\n\n## Objectif\nRemporter les jetons des autres joueurs en ayant la meilleure main de 5 cartes.\n\n## Distribution\n- Chaque joueur reçoit 2 cartes privées (hole cards)\n- 5 cartes communes sont révélées progressivement (flop, turn, river)\n\n## Tours de mise\n1. Pre-flop : après distribution des cartes privées\n2. Flop : après révélation de 3 cartes communes\n3. Turn : après la 4ème carte commune\n4. River : après la 5ème carte commune\n\n## Combinaisons (de la plus forte à la plus faible)\n1. Quinte Flush Royale\n2. Quinte Flush\n3. Carré\n4. Full\n5. Couleur\n6. Quinte\n7. Brelan\n8. Double Paire\n9. Paire\n10. Carte Haute',
    '[{"condition_type": "OBJECTIVE", "objective_description": "Meilleure main de 5 cartes"}]',
    2,
    10
  ),
  (
    'UNO',
    'Le célèbre jeu de cartes où il faut crier UNO !',
    E'# Règles du UNO\n\n## Objectif\nÊtre le premier à se débarrasser de toutes ses cartes.\n\n## Distribution\nChaque joueur reçoit 7 cartes.\n\n## Déroulement\n- Jouer une carte de la même couleur, du même numéro ou une carte action\n- Si impossible, piocher une carte\n- Crier "UNO !" quand il ne reste qu''une carte\n\n## Cartes Spéciales\n- **+2** : Le joueur suivant pioche 2 cartes\n- **Inversion** : Change le sens du jeu\n- **Passer** : Le joueur suivant passe son tour\n- **Joker** : Change la couleur\n- **+4** : Le joueur suivant pioche 4 cartes (peut être contesté)',
    '[{"condition_type": "EMPTY_HAND"}]',
    2,
    10
  ),
  (
    'Belote',
    'Le jeu de cartes français classique à 4 joueurs',
    E'# Règles de la Belote\n\n## Objectif\nMarquer 501 points en premier (ou 1000 selon variante).\n\n## Distribution\n- 32 cartes (7, 8, 9, 10, Valet, Dame, Roi, As)\n- Distribution en 2 fois : 3 puis 2 cartes par joueur\n- Retourne d''atout\n\n## Valeurs des cartes (atout)\n- Valet : 20 points\n- 9 : 14 points\n- As : 11 points\n- 10 : 10 points\n- Roi : 4 points\n- Dame : 3 points\n- 8, 7 : 0 points\n\n## Annonces\n- Belote-Rebelote : 20 points\n- Tierce : 20 points\n- Cinquante : 50 points\n- Cent : 100 points\n- Carré : 100-200 points',
    '[{"condition_type": "SCORE_THRESHOLD", "threshold": 501}]',
    4,
    4
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to clean up old snapshots (keep last 10 per game)
CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM game_snapshots
  WHERE game_id = NEW.game_id
    AND id NOT IN (
      SELECT id FROM game_snapshots
      WHERE game_id = NEW.game_id
      ORDER BY created_at DESC
      LIMIT 10
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-cleanup on new snapshot insert
DROP TRIGGER IF EXISTS trigger_cleanup_old_snapshots ON game_snapshots;
CREATE TRIGGER trigger_cleanup_old_snapshots
  AFTER INSERT ON game_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_snapshots();

-- Function to update predefined_games updated_at
CREATE OR REPLACE FUNCTION update_predefined_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_predefined_games_updated_at ON predefined_games;
CREATE TRIGGER trigger_update_predefined_games_updated_at
  BEFORE UPDATE ON predefined_games
  FOR EACH ROW
  EXECUTE FUNCTION update_predefined_games_updated_at();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
