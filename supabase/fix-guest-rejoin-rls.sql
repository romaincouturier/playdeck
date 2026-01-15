-- ============================================
-- PERMETTRE AUX INVITÉS DE VOIR LES PARTIES EN COURS
-- ============================================

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Anyone can view waiting games" ON public.games;

-- Nouvelle politique : les invités peuvent voir toutes les parties
-- (pas seulement celles en attente)
CREATE POLICY "Anyone can view games"
  ON public.games FOR SELECT
  USING (true); -- Permet à tout le monde de voir toutes les parties

-- Note : La sécurité est maintenue car on vérifie côté serveur
-- que l'invité est bien dans la partie avant de l'autoriser à jouer
