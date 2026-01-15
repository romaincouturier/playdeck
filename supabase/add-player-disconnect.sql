-- ============================================
-- GESTION DES JOUEURS QUI QUITTENT
-- ============================================

-- Ajouter un champ pour marquer les joueurs qui ont quitté
ALTER TABLE public.game_players
  ADD COLUMN IF NOT EXISTS has_left BOOLEAN DEFAULT FALSE;

-- Index pour filtrer les joueurs actifs
CREATE INDEX IF NOT EXISTS idx_game_players_has_left
  ON public.game_players(game_id, has_left);
