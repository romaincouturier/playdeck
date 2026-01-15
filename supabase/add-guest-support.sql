-- ============================================
-- SUPPORT DES JOUEURS INVITÉS (SANS COMPTE)
-- ============================================

-- Modifier la table game_players pour supporter les invités
ALTER TABLE public.game_players
  ALTER COLUMN user_id DROP NOT NULL;

-- Ajouter un champ pour stocker le nom de l'invité
ALTER TABLE public.game_players
  ADD COLUMN IF NOT EXISTS guest_name TEXT;

-- Ajouter un identifiant de session pour les invités
ALTER TABLE public.game_players
  ADD COLUMN IF NOT EXISTS guest_session_id TEXT;

-- Contrainte : soit user_id soit guest_session_id doit être présent
ALTER TABLE public.game_players
  ADD CONSTRAINT user_or_guest CHECK (
    (user_id IS NOT NULL AND guest_session_id IS NULL) OR
    (user_id IS NULL AND guest_session_id IS NOT NULL)
  );

-- Index pour les sessions invités
CREATE INDEX IF NOT EXISTS idx_game_players_guest_session
  ON public.game_players(guest_session_id);

-- ============================================
-- METTRE À JOUR LES POLITIQUES RLS
-- ============================================

-- Supprimer les anciennes politiques game_players
DROP POLICY IF EXISTS "Players can view players in their games" ON public.game_players;
DROP POLICY IF EXISTS "Users can join games" ON public.game_players;
DROP POLICY IF EXISTS "Players can leave games" ON public.game_players;

-- Nouvelle politique SELECT : voir tous les joueurs de ses parties
CREATE POLICY "Players can view players in their games"
  ON public.game_players FOR SELECT
  USING (
    -- Utilisateurs authentifiés : voir leurs parties
    (auth.uid() IS NOT NULL AND game_id IN (SELECT user_game_ids(auth.uid()))) OR
    -- Invités : voir tous les joueurs (on vérifiera côté serveur)
    (auth.uid() IS NULL)
  );

-- Nouvelle politique INSERT : rejoindre des parties
CREATE POLICY "Anyone can join games"
  ON public.game_players FOR INSERT
  WITH CHECK (
    -- Utilisateurs authentifiés : peuvent s'ajouter
    (user_id IS NOT NULL AND auth.uid() = user_id) OR
    -- Invités : peuvent s'ajouter avec un guest_session_id
    (guest_session_id IS NOT NULL AND user_id IS NULL)
  );

-- Nouvelle politique DELETE : quitter des parties
CREATE POLICY "Players can leave games"
  ON public.game_players FOR DELETE
  USING (
    -- Utilisateurs authentifiés
    (user_id IS NOT NULL AND auth.uid() = user_id) OR
    -- Invités : on ne peut pas facilement identifier côté RLS, géré côté serveur
    (guest_session_id IS NOT NULL)
  );

-- ============================================
-- METTRE À JOUR LES POLITIQUES GAME_CARDS
-- ============================================

-- Modifier owner_user_id pour accepter NULL (invités)
ALTER TABLE public.game_cards
  ALTER COLUMN owner_user_id DROP NOT NULL;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Players can view cards in their games" ON public.game_cards;
DROP POLICY IF EXISTS "Players can manage cards in their games" ON public.game_cards;
DROP POLICY IF EXISTS "Players can update cards in their games" ON public.game_cards;
DROP POLICY IF EXISTS "Players can delete cards in their games" ON public.game_cards;

-- Nouvelles politiques pour game_cards (invités + authentifiés)
CREATE POLICY "Anyone in game can view cards"
  ON public.game_cards FOR SELECT
  USING (true); -- On vérifie côté serveur avec le session_id

CREATE POLICY "Anyone in game can manage cards"
  ON public.game_cards FOR INSERT
  WITH CHECK (true); -- Vérifié côté serveur

CREATE POLICY "Anyone in game can update cards"
  ON public.game_cards FOR UPDATE
  USING (true); -- Vérifié côté serveur

CREATE POLICY "Anyone in game can delete cards"
  ON public.game_cards FOR DELETE
  USING (true); -- Vérifié côté serveur

-- ============================================
-- FONCTION POUR DISTRIBUER LES CARTES (MAJ)
-- ============================================

-- Mettre à jour la fonction de distribution pour gérer les invités
CREATE OR REPLACE FUNCTION distribute_cards(p_game_id UUID, p_cards_per_player INTEGER DEFAULT 5)
RETURNS VOID AS $$
DECLARE
  v_card RECORD;
  v_player RECORD;
  v_position INTEGER := 0;
  v_player_position INTEGER;
  v_player_id UUID;
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

  -- Distribuer les cartes aux joueurs (user_id OU guest_session_id)
  FOR v_player IN
    SELECT
      user_id,
      guest_session_id,
      player_order
    FROM public.game_players
    WHERE game_id = p_game_id
    ORDER BY player_order
  LOOP
    v_player_position := 0;
    -- Utiliser user_id si présent, sinon NULL pour les invités
    v_player_id := v_player.user_id;

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
        owner_user_id = v_player_id, -- NULL pour les invités
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
