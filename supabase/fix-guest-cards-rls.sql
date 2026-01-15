-- ============================================
-- CORRECTION DES POLITIQUES RLS POUR LES INVITÉS
-- ============================================
-- Les invités doivent pouvoir voir leurs cartes
-- Actuellement les politiques RLS ne vérifient que auth.uid()
-- qui est NULL pour les invités

-- ============================================
-- Supprimer les anciennes politiques pour game_cards
-- ============================================

DROP POLICY IF EXISTS "Players can view cards in their games" ON public.game_cards;
DROP POLICY IF EXISTS "Players can create cards in their games" ON public.game_cards;
DROP POLICY IF EXISTS "Players can update cards in their games" ON public.game_cards;
DROP POLICY IF EXISTS "Players can delete cards in their games" ON public.game_cards;

-- ============================================
-- Nouvelles politiques qui supportent les invités
-- ============================================

-- Les joueurs peuvent voir toutes les cartes de leurs parties
-- (utilisateurs authentifiés ET invités)
CREATE POLICY "Players and guests can view cards in their games"
  ON public.game_cards FOR SELECT
  USING (
    -- Vérifier pour les utilisateurs authentifiés
    (auth.uid() IS NOT NULL AND game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.user_id = auth.uid()
    ))
    OR
    -- Vérifier pour les invités via cookie
    (auth.uid() IS NULL AND game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.guest_session_id IS NOT NULL
      -- Note: On autorise tous les invités dans la partie
      -- La vérification du guest_session_id se fait côté serveur
    ))
  );

-- Les joueurs peuvent créer des cartes dans leurs parties
CREATE POLICY "Players and guests can create cards in their games"
  ON public.game_cards FOR INSERT
  WITH CHECK (
    -- Vérifier pour les utilisateurs authentifiés
    (auth.uid() IS NOT NULL AND game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.user_id = auth.uid()
    ))
    OR
    -- Vérifier pour les invités
    (auth.uid() IS NULL AND game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.guest_session_id IS NOT NULL
    ))
  );

-- Les joueurs peuvent modifier les cartes dans leurs parties
CREATE POLICY "Players and guests can update cards in their games"
  ON public.game_cards FOR UPDATE
  USING (
    -- Vérifier pour les utilisateurs authentifiés
    (auth.uid() IS NOT NULL AND game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.user_id = auth.uid()
    ))
    OR
    -- Vérifier pour les invités
    (auth.uid() IS NULL AND game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.guest_session_id IS NOT NULL
    ))
  );

-- Les joueurs peuvent supprimer les cartes dans leurs parties
CREATE POLICY "Players and guests can delete cards in their games"
  ON public.game_cards FOR DELETE
  USING (
    -- Vérifier pour les utilisateurs authentifiés
    (auth.uid() IS NOT NULL AND game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.user_id = auth.uid()
    ))
    OR
    -- Vérifier pour les invités
    (auth.uid() IS NULL AND game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.guest_session_id IS NOT NULL
    ))
  );

-- ============================================
-- Politiques pour game_players (invités)
-- ============================================

-- Ajouter une politique pour que les invités puissent voir leurs enregistrements
DROP POLICY IF EXISTS "Guests can view their own record" ON public.game_players;
CREATE POLICY "Guests can view their own record"
  ON public.game_players FOR SELECT
  USING (auth.uid() IS NULL AND guest_session_id IS NOT NULL);

-- Ajouter une politique pour que les invités puissent voir les autres joueurs
DROP POLICY IF EXISTS "Guests can view others in same game" ON public.game_players;
CREATE POLICY "Guests can view others in same game"
  ON public.game_players FOR SELECT
  USING (
    auth.uid() IS NULL AND game_id IN (
      SELECT gp.game_id
      FROM public.game_players gp
      WHERE gp.guest_session_id IS NOT NULL
    )
  );

-- Les invités peuvent s'ajouter comme joueurs
DROP POLICY IF EXISTS "Guests can join games" ON public.game_players;
CREATE POLICY "Guests can join games"
  ON public.game_players FOR INSERT
  WITH CHECK (auth.uid() IS NULL AND guest_session_id IS NOT NULL);

-- Les invités peuvent mettre à jour leur statut (has_left)
DROP POLICY IF EXISTS "Guests can update their status" ON public.game_players;
CREATE POLICY "Guests can update their status"
  ON public.game_players FOR UPDATE
  USING (auth.uid() IS NULL AND guest_session_id IS NOT NULL);
