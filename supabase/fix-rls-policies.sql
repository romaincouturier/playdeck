-- ============================================
-- CORRECTION DES POLITIQUES RLS (Row Level Security)
-- ============================================
-- Ce script corrige le problème de récursion infinie
-- Exécutez ce script dans Supabase SQL Editor

-- D'abord, supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "Anyone can view games they're part of" ON public.games;
DROP POLICY IF EXISTS "Users can create games" ON public.games;
DROP POLICY IF EXISTS "Host can update their games" ON public.games;
DROP POLICY IF EXISTS "Host can delete their games" ON public.games;

DROP POLICY IF EXISTS "Players can view other players in their games" ON public.game_players;
DROP POLICY IF EXISTS "Users can join games" ON public.game_players;
DROP POLICY IF EXISTS "Players can leave games" ON public.game_players;

DROP POLICY IF EXISTS "Players can view cards in their games" ON public.game_cards;
DROP POLICY IF EXISTS "Game system can manage cards" ON public.game_cards;
DROP POLICY IF EXISTS "Game system can update cards" ON public.game_cards;

-- ============================================
-- NOUVELLES POLITIQUES SANS RÉCURSION
-- ============================================

-- ============================================
-- Politiques pour la table GAMES
-- ============================================

-- Les utilisateurs peuvent voir les parties où ils sont l'hôte
CREATE POLICY "Users can view games they host"
  ON public.games FOR SELECT
  USING (auth.uid() = host_id);

-- Les utilisateurs peuvent voir les parties où ils sont joueurs
-- NOTE: Cette politique utilise game_players mais ne cause pas de récursion
-- car elle n'est pas sur game_players elle-même
CREATE POLICY "Users can view games they joined"
  ON public.games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_players
      WHERE game_players.game_id = games.id
      AND game_players.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent créer des parties
CREATE POLICY "Users can create games"
  ON public.games FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Seul l'hôte peut modifier sa partie
CREATE POLICY "Host can update their games"
  ON public.games FOR UPDATE
  USING (auth.uid() = host_id);

-- Seul l'hôte peut supprimer sa partie
CREATE POLICY "Host can delete their games"
  ON public.games FOR DELETE
  USING (auth.uid() = host_id);

-- ============================================
-- Politiques pour la table GAME_PLAYERS
-- ============================================

-- Les joueurs peuvent voir tous les joueurs de leurs parties
-- CORRECTION: On utilise user_id directement pour éviter la récursion
CREATE POLICY "Players can view their own record"
  ON public.game_players FOR SELECT
  USING (auth.uid() = user_id);

-- Les joueurs peuvent voir les autres joueurs de la même partie
CREATE POLICY "Players can view others in same game"
  ON public.game_players FOR SELECT
  USING (
    game_id IN (
      -- Sous-requête qui ne déclenche PAS de RLS car elle filtre sur user_id
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent s'ajouter comme joueurs
CREATE POLICY "Users can join games"
  ON public.game_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Les joueurs peuvent quitter leurs parties
CREATE POLICY "Players can leave games"
  ON public.game_players FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Politiques pour la table GAME_CARDS
-- ============================================

-- Les joueurs peuvent voir toutes les cartes de leurs parties
CREATE POLICY "Players can view cards in their games"
  ON public.game_cards FOR SELECT
  USING (
    game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.user_id = auth.uid()
    )
  );

-- Les joueurs peuvent créer des cartes dans leurs parties
CREATE POLICY "Players can create cards in their games"
  ON public.game_cards FOR INSERT
  WITH CHECK (
    game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.user_id = auth.uid()
    )
  );

-- Les joueurs peuvent modifier les cartes dans leurs parties
CREATE POLICY "Players can update cards in their games"
  ON public.game_cards FOR UPDATE
  USING (
    game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.user_id = auth.uid()
    )
  );

-- Les joueurs peuvent supprimer les cartes dans leurs parties
CREATE POLICY "Players can delete cards in their games"
  ON public.game_cards FOR DELETE
  USING (
    game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.user_id = auth.uid()
    )
  );
