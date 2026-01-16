-- ========================================================
-- NETTOYAGE TOTAL ET RECONSTRUCTION DES RÈGLES RLS (ROBUSTE)
-- ========================================================
-- Ce script casse la récursion infinie en supprimant TOUTES
-- les politiques existantes et en utilisant une fonction
-- SECURITY DEFINER isolée.

-- 1. DÉSACTIVER RLS TEMPORAIREMENT POUR LE NETTOYAGE
ALTER TABLE public.games DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_cards DISABLE ROW LEVEL SECURITY;

-- 2. SUPPRIMER TOUTES LES POLITIQUES EXISTANTES (BOUCLE AUTOMATIQUE)
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('games', 'game_players', 'game_cards')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. CRÉATION DE LA FONCTION DE VÉRIFICATION (ANTIRÉCURSION)
-- SECURITY DEFINER : S'exécute avec les droits du créateur (bypass RLS)
-- SET search_path = public : Empêche de chercher dans d'autres schémas récursifs
CREATE OR REPLACE FUNCTION public.is_game_participant(p_game_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.game_players 
    WHERE game_id = p_game_id 
    AND (user_id = p_user_id)
  );
$$;

-- 4. RÉACTIVER RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_cards ENABLE ROW LEVEL SECURITY;

-- 5. POLITIQUES 'GAMES' (On permet de VOIR les parties en attente ou en cours)
CREATE POLICY "games_select_public" ON public.games FOR SELECT 
USING (status IN ('waiting', 'playing'));

CREATE POLICY "games_select_participant" ON public.games FOR SELECT 
USING (auth.uid() = host_id OR public.is_game_participant(id, auth.uid()));

CREATE POLICY "games_insert_policy" ON public.games FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "games_update_policy" ON public.games FOR UPDATE USING (auth.uid() = host_id);

-- 6. POLITIQUES 'GAME_PLAYERS'
CREATE POLICY "players_select_public" ON public.game_players FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.games WHERE id = game_players.game_id AND status IN ('waiting', 'playing')));

CREATE POLICY "players_select_own" ON public.game_players FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "players_select_team" ON public.game_players FOR SELECT USING (public.is_game_participant(game_id, auth.uid()));
CREATE POLICY "players_insert_policy" ON public.game_players FOR INSERT WITH CHECK (true);

-- 7. POLITIQUES 'GAME_CARDS'
CREATE POLICY "cards_select_public" ON public.game_cards FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.games WHERE id = game_cards.game_id AND status IN ('waiting', 'playing')));

CREATE POLICY "cards_select_participant" ON public.game_cards FOR SELECT USING (public.is_game_participant(game_id, auth.uid()));
CREATE POLICY "cards_all_policy" ON public.game_cards FOR ALL USING (public.is_game_participant(game_id, auth.uid()));

-- 8. DROITS
GRANT EXECUTE ON FUNCTION public.is_game_participant TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_game_participant TO anon;

-- FIN DU SCRIPT
COMMIT;
