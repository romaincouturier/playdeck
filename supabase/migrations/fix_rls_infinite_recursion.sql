-- ============================================================================
-- FIX: Infinite Recursion in RLS Policies
-- ============================================================================
-- Problème: Les policies sur games, zones, turn_state font des sous-requêtes
-- sur game_players, qui elle-même a des policies vérifiant games.
-- Solution: Utiliser des fonctions SECURITY DEFINER pour contourner RLS
-- dans les vérifications internes.
-- ============================================================================

-- Fonction helper: Vérifie si l'utilisateur est dans une partie (sans RLS)
CREATE OR REPLACE FUNCTION is_player_in_game(p_game_id UUID, p_user_id UUID DEFAULT auth.uid(), p_guest_session_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM game_players
    WHERE game_id = p_game_id
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (p_guest_session_id IS NOT NULL AND guest_session_id = p_guest_session_id)
    )
  );
END;
$$;

COMMENT ON FUNCTION is_player_in_game IS 'Vérifie si un utilisateur participe à une partie (sans déclencher RLS)';

-- Fonction helper: Vérifie si l'utilisateur est GM d'une partie (sans RLS)
CREATE OR REPLACE FUNCTION is_game_master(p_game_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM game_master
    WHERE game_id = p_game_id
    AND user_id = p_user_id
  );
END;
$$;

COMMENT ON FUNCTION is_game_master IS 'Vérifie si un utilisateur est GM d''une partie (sans déclencher RLS)';

-- Fonction helper: Récupère l'ID du joueur courant dans une partie (sans RLS)
CREATE OR REPLACE FUNCTION get_player_id_in_game(p_game_id UUID, p_user_id UUID DEFAULT auth.uid(), p_guest_session_id TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id UUID;
BEGIN
  SELECT id INTO v_player_id
  FROM game_players
  WHERE game_id = p_game_id
  AND (
    (p_user_id IS NOT NULL AND user_id = p_user_id)
    OR (p_guest_session_id IS NOT NULL AND guest_session_id = p_guest_session_id)
  )
  LIMIT 1;

  RETURN v_player_id;
END;
$$;

COMMENT ON FUNCTION get_player_id_in_game IS 'Récupère l''ID du joueur dans une partie (sans déclencher RLS)';

-- ============================================================================
-- RECRÉER LES POLICIES SANS RÉCURSION
-- ============================================================================

-- GAMES: Réécrire les policies pour utiliser les fonctions helper
DROP POLICY IF EXISTS "Players can view games they participate in" ON games;
CREATE POLICY "Players can view games they participate in"
  ON games FOR SELECT
  USING (
    status = 'public'
    OR game_master_id = auth.uid()
    OR is_player_in_game(id, auth.uid(), current_setting('app.guest_session_id', true))
  );

-- ZONES: Réécrire pour utiliser les fonctions helper
DROP POLICY IF EXISTS "Players can view zones in their games" ON zones;
CREATE POLICY "Players can view zones in their games"
  ON zones FOR SELECT
  USING (
    -- Le joueur doit être dans la partie
    is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true))
    AND (
      -- Visibilité ALL: tout le monde voit
      visibility = 'ALL'
      -- Visibilité OWNER: seul le propriétaire voit
      OR (visibility = 'OWNER' AND owner_player_id = get_player_id_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true)))
      -- Visibilité GM_ONLY: seul le GM voit
      OR (visibility = 'GM_ONLY' AND is_game_master(game_id, auth.uid()))
      -- Visibilité PRIVATE: zone globale visible par tous les joueurs
      OR (visibility = 'PRIVATE' AND owner_player_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Game master can manage zones" ON zones;
CREATE POLICY "Game master can manage zones"
  ON zones FOR ALL
  USING (is_game_master(game_id, auth.uid()))
  WITH CHECK (is_game_master(game_id, auth.uid()));

-- TURN_STATE: Réécrire pour utiliser les fonctions helper
DROP POLICY IF EXISTS "Players can view turn state in their games" ON turn_state;
CREATE POLICY "Players can view turn state in their games"
  ON turn_state FOR SELECT
  USING (is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true)));

DROP POLICY IF EXISTS "Game master can manage turn state" ON turn_state;
CREATE POLICY "Game master can manage turn state"
  ON turn_state FOR ALL
  USING (is_game_master(game_id, auth.uid()))
  WITH CHECK (is_game_master(game_id, auth.uid()));

-- PRIMITIVE_ACTIONS: Réécrire pour utiliser les fonctions helper
DROP POLICY IF EXISTS "Players can view actions in their games" ON primitive_actions;
CREATE POLICY "Players can view actions in their games"
  ON primitive_actions FOR SELECT
  USING (is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true)));

DROP POLICY IF EXISTS "Players and GM can insert actions" ON primitive_actions;
CREATE POLICY "Players and GM can insert actions"
  ON primitive_actions FOR INSERT
  WITH CHECK (is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true)));

-- GAME_RULES_TEXT: Réécrire pour utiliser les fonctions helper
DROP POLICY IF EXISTS "Players can view rules in their games" ON game_rules_text;
CREATE POLICY "Players can view rules in their games"
  ON game_rules_text FOR SELECT
  USING (is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true)));

DROP POLICY IF EXISTS "Game master can manage rules" ON game_rules_text;
CREATE POLICY "Game master can manage rules"
  ON game_rules_text FOR ALL
  USING (is_game_master(game_id, auth.uid()))
  WITH CHECK (is_game_master(game_id, auth.uid()));

-- CARD_GROUPS: Réécrire pour utiliser les fonctions helper
DROP POLICY IF EXISTS "Players can view groups in their games" ON card_groups;
CREATE POLICY "Players can view groups in their games"
  ON card_groups FOR SELECT
  USING (is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true)));

DROP POLICY IF EXISTS "Players can manage own groups" ON card_groups;
CREATE POLICY "Players can manage own groups"
  ON card_groups FOR ALL
  USING (
    is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true))
    AND owner_player_id = get_player_id_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true))
  )
  WITH CHECK (
    is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true))
    AND owner_player_id = get_player_id_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true))
  );

-- CARD_MARKS: Réécrire pour utiliser les fonctions helper
DROP POLICY IF EXISTS "Players can view marks in their games" ON card_marks;
CREATE POLICY "Players can view marks in their games"
  ON card_marks FOR SELECT
  USING (is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true)));

DROP POLICY IF EXISTS "Game master can manage marks" ON card_marks;
CREATE POLICY "Game master can manage marks"
  ON card_marks FOR ALL
  USING (is_game_master(game_id, auth.uid()))
  WITH CHECK (is_game_master(game_id, auth.uid()));

-- GAME_SNAPSHOTS: Réécrire pour utiliser les fonctions helper
DROP POLICY IF EXISTS "Game master can manage snapshots" ON game_snapshots;
CREATE POLICY "Game master can manage snapshots"
  ON game_snapshots FOR ALL
  USING (is_game_master(game_id, auth.uid()))
  WITH CHECK (is_game_master(game_id, auth.uid()));

-- PLAYER_VISIBILITY_OVERRIDES: Réécrire pour utiliser les fonctions helper
DROP POLICY IF EXISTS "Players can view own visibility overrides" ON player_visibility_overrides;
CREATE POLICY "Players can view own visibility overrides"
  ON player_visibility_overrides FOR SELECT
  USING (
    is_player_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true))
    AND (
      viewer_player_id = get_player_id_in_game(game_id, auth.uid(), current_setting('app.guest_session_id', true))
      OR is_game_master(game_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Game master can manage visibility overrides" ON player_visibility_overrides;
CREATE POLICY "Game master can manage visibility overrides"
  ON player_visibility_overrides FOR ALL
  USING (is_game_master(game_id, auth.uid()))
  WITH CHECK (is_game_master(game_id, auth.uid()));

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '======================';
  RAISE NOTICE 'RLS POLICIES REBUILT';
  RAISE NOTICE '======================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fonctions helper créées:';
  RAISE NOTICE '   - is_player_in_game()';
  RAISE NOTICE '   - is_game_master()';
  RAISE NOTICE '   - get_player_id_in_game()';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Policies recréées sans récursion:';
  RAISE NOTICE '   - games (1 policy)';
  RAISE NOTICE '   - zones (2 policies)';
  RAISE NOTICE '   - turn_state (2 policies)';
  RAISE NOTICE '   - primitive_actions (2 policies)';
  RAISE NOTICE '   - game_rules_text (2 policies)';
  RAISE NOTICE '   - card_groups (2 policies)';
  RAISE NOTICE '   - card_marks (2 policies)';
  RAISE NOTICE '   - game_snapshots (1 policy)';
  RAISE NOTICE '   - player_visibility_overrides (2 policies)';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Infinite recursion fixed!';
  RAISE NOTICE '';
END $$;
