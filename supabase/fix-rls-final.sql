-- ============================================
-- SOLUTION DÉFINITIVE POUR LA RÉCURSION RLS
-- ============================================
-- Ce script corrige définitivement le problème de récursion
-- en utilisant une fonction SECURITY DEFINER

-- D'abord, supprimer TOUTES les politiques existantes
DROP POLICY IF EXISTS "Users can view games they host" ON public.games;
DROP POLICY IF EXISTS "Users can view games they joined" ON public.games;
DROP POLICY IF EXISTS "Users can create games" ON public.games;
DROP POLICY IF EXISTS "Host can update their games" ON public.games;
DROP POLICY IF EXISTS "Host can delete their games" ON public.games;

DROP POLICY IF EXISTS "Players can view their own record" ON public.game_players;
DROP POLICY IF EXISTS "Players can view others in same game" ON public.game_players;
DROP POLICY IF EXISTS "Users can join games" ON public.game_players;
DROP POLICY IF EXISTS "Players can leave games" ON public.game_players;

DROP POLICY IF EXISTS "Players can view cards in their games" ON public.game_cards;
DROP POLICY IF EXISTS "Players can create cards in their games" ON public.game_cards;
DROP POLICY IF EXISTS "Players can update cards in their games" ON public.game_cards;
DROP POLICY IF EXISTS "Players can delete cards in their games" ON public.game_cards;

-- ============================================
-- FONCTION HELPER POUR ÉVITER LA RÉCURSION
-- ============================================

-- Cette fonction retourne les game_ids où l'utilisateur est joueur
-- SECURITY DEFINER permet de contourner les politiques RLS
CREATE OR REPLACE FUNCTION user_game_ids(p_user_id UUID)
RETURNS TABLE(game_id UUID)
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT game_id
  FROM public.game_players
  WHERE user_id = p_user_id;
$$;

-- ============================================
-- NOUVELLES POLITIQUES SANS RÉCURSION
-- ============================================

-- ============================================
-- Politiques pour GAMES
-- ============================================

CREATE POLICY "Users can view their games"
  ON public.games FOR SELECT
  USING (
    auth.uid() = host_id OR
    id IN (SELECT user_game_ids(auth.uid()))
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

-- ============================================
-- Politiques pour GAME_PLAYERS
-- ============================================

-- Les joueurs peuvent voir TOUS les joueurs de LEURS parties
CREATE POLICY "Players can view players in their games"
  ON public.game_players FOR SELECT
  USING (
    game_id IN (SELECT user_game_ids(auth.uid()))
  );

CREATE POLICY "Users can join games"
  ON public.game_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can leave games"
  ON public.game_players FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Politiques pour GAME_CARDS
-- ============================================

CREATE POLICY "Players can view cards in their games"
  ON public.game_cards FOR SELECT
  USING (
    game_id IN (SELECT user_game_ids(auth.uid()))
  );

CREATE POLICY "Players can manage cards in their games"
  ON public.game_cards FOR INSERT
  WITH CHECK (
    game_id IN (SELECT user_game_ids(auth.uid()))
  );

CREATE POLICY "Players can update cards in their games"
  ON public.game_cards FOR UPDATE
  USING (
    game_id IN (SELECT user_game_ids(auth.uid()))
  );

CREATE POLICY "Players can delete cards in their games"
  ON public.game_cards FOR DELETE
  USING (
    game_id IN (SELECT user_game_ids(auth.uid()))
  );
