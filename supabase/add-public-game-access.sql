-- ============================================
-- AUTORISER L'ACCÈS PUBLIC AUX PARTIES EN ATTENTE
-- ============================================
-- Permet aux utilisateurs non connectés de voir les parties
-- pour pouvoir rejoindre via un lien partagé

-- Politique pour permettre aux utilisateurs non authentifiés
-- de voir les parties en attente (pour vérifier le code)
CREATE POLICY "Anyone can view waiting games"
  ON public.games FOR SELECT
  USING (status = 'waiting');

-- Note: Cette politique s'ajoute aux politiques existantes.
-- Les utilisateurs authentifiés continueront à voir leurs propres parties
-- grâce aux autres politiques.
