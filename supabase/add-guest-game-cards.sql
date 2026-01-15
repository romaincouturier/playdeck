-- ============================================
-- SUPPORT DES CARTES POUR LES INVITÉS
-- ============================================

-- Ajouter owner_guest_session_id pour identifier les cartes des invités
ALTER TABLE public.game_cards
  ADD COLUMN IF NOT EXISTS owner_guest_session_id TEXT;

-- Contrainte : soit owner_user_id soit owner_guest_session_id (ou ni l'un ni l'autre pour pioche/défausse)
ALTER TABLE public.game_cards
  DROP CONSTRAINT IF EXISTS owner_constraint;

ALTER TABLE public.game_cards
  ADD CONSTRAINT owner_constraint CHECK (
    -- Soit user_id uniquement
    (owner_user_id IS NOT NULL AND owner_guest_session_id IS NULL) OR
    -- Soit guest_session_id uniquement
    (owner_user_id IS NULL AND owner_guest_session_id IS NOT NULL) OR
    -- Soit aucun des deux (cartes dans la pioche/défausse)
    (owner_user_id IS NULL AND owner_guest_session_id IS NULL)
  );

-- Index pour rechercher les cartes d'un invité
CREATE INDEX IF NOT EXISTS idx_game_cards_owner_guest_session
  ON public.game_cards(owner_guest_session_id);

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

    FOR v_card IN
      SELECT id
      FROM public.game_cards
      WHERE game_id = p_game_id
      AND location = 'deck'
      ORDER BY position
      LIMIT p_cards_per_player
    LOOP
      -- Mettre owner_user_id OU owner_guest_session_id selon le type de joueur
      IF v_player.user_id IS NOT NULL THEN
        UPDATE public.game_cards
        SET
          location = 'hand',
          owner_user_id = v_player.user_id,
          owner_guest_session_id = NULL,
          position = v_player_position
        WHERE id = v_card.id;
      ELSE
        UPDATE public.game_cards
        SET
          location = 'hand',
          owner_user_id = NULL,
          owner_guest_session_id = v_player.guest_session_id,
          position = v_player_position
        WHERE id = v_card.id;
      END IF;

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
