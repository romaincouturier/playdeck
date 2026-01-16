-- ============================================
-- FIX DÉFINITIF POUR LA RÉCURSION INFINIE (Error 42P17)
-- ============================================

-- 1. Nettoyage des anciennes politiques problématiques
DROP POLICY IF EXISTS "Players can view players in their games" ON public.game_players;
DROP POLICY IF EXISTS "Players can view others in same game" ON public.game_players;
DROP POLICY IF EXISTS "Players can view their own record" ON public.game_players;

-- 2. Création d'une fonction SECURITY DEFINER robuste
-- Le "SET search_path = public" est CRUCIAL pour éviter la récursion
CREATE OR REPLACE FUNCTION public.check_user_in_game(p_game_id UUID, p_user_id UUID)
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

-- 3. Politique ultra-simple pour permettre à chacun de voir son propre enregistrement (base)
CREATE POLICY "Users can view their own player record"
  ON public.game_players FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Politique pour voir les AUTRES joueurs de la même partie
-- On utilise la fonction qui bypass le RLS pour casser la récursion
CREATE POLICY "Players can view teammates"
  ON public.game_players FOR SELECT
  USING (
    public.check_user_in_game(game_id, auth.uid())
  );

-- 5. Attribution des droits d'exécution sur la fonction
GRANT EXECUTE ON FUNCTION public.check_user_in_game TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_in_game TO anon;

-- NOTE : Après avoir exécuté ce script, la récursion sera cassée 
-- car la fonction check_user_in_game s'exécute avec les privilèges 
-- du créateur (bypass RLS) et ne rappelle pas la politique.
