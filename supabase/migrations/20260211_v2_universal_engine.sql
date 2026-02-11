-- Migration v2 : Moteur Universel de Jeu de Cartes
-- Date: 2026-02-11
-- Description: Refonte complète pour système MJ + primitives

-- ============================================================================
-- 1. NOUVELLES TABLES
-- ============================================================================

-- Table: game_master - Configuration du Maître du Jeu
CREATE TABLE IF NOT EXISTS game_master (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_playing BOOLEAN DEFAULT false,
  omniscient_mode BOOLEAN DEFAULT true,
  can_undo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE game_master IS 'Configuration du rôle Maître du Jeu pour chaque partie';
COMMENT ON COLUMN game_master.is_playing IS 'Le MJ participe comme joueur ou arbitre uniquement';
COMMENT ON COLUMN game_master.omniscient_mode IS 'Le MJ voit toutes les cartes de toutes les zones';

-- Index
CREATE INDEX idx_game_master_user ON game_master(user_id);

-- RLS
ALTER TABLE game_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game master can view own games"
  ON game_master FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Game master can insert own games"
  ON game_master FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Game master can update own games"
  ON game_master FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================

-- Table: zones - Zones dynamiques de jeu (REFONTE COMPLÈTE)
DROP TABLE IF EXISTS zones CASCADE;

CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DECK', 'HAND', 'CENTER', 'DISCARD', 'CUSTOM')),

  -- Propriétés de visibilité
  visibility TEXT DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'OWNER', 'ALL', 'GM_ONLY')),
  default_face TEXT DEFAULT 'HIDDEN' CHECK (default_face IN ('VISIBLE', 'HIDDEN')),

  -- Propriétés de capacité
  is_ordered BOOLEAN DEFAULT true,
  max_capacity INTEGER, -- NULL = illimité

  -- Propriétaire (NULL = zone globale)
  owner_player_id UUID REFERENCES game_players(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,

  -- Position visuelle (pour emplacements sur tapis)
  position_x INTEGER,
  position_y INTEGER,
  width INTEGER,
  height INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE zones IS 'Zones dynamiques configurables (pioche, mains, centre, défausse, custom)';
COMMENT ON COLUMN zones.visibility IS 'Qui peut voir les cartes de cette zone';
COMMENT ON COLUMN zones.default_face IS 'Face par défaut quand carte arrive dans zone';
COMMENT ON COLUMN zones.owner_player_id IS 'NULL = zone globale, sinon zone d''un joueur spécifique';

-- Index
CREATE INDEX idx_zones_game ON zones(game_id);
CREATE INDEX idx_zones_type ON zones(game_id, type);
CREATE INDEX idx_zones_owner ON zones(owner_player_id);

-- RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view zones in their games"
  ON zones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = zones.game_id
      AND (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

CREATE POLICY "Game master can manage zones"
  ON zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM game_master
      WHERE game_id = zones.game_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================

-- Table: card_categories - Catégories de cartes
CREATE TABLE IF NOT EXISTS card_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE card_categories IS 'Catégories de cartes (atouts, honneurs, spéciales, etc.)';

-- Index
CREATE INDEX idx_card_categories_deck ON card_categories(deck_id);

-- RLS
ALTER TABLE card_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories in own decks"
  ON card_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM decks
      WHERE id = card_categories.deck_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage categories in own decks"
  ON card_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM decks
      WHERE id = card_categories.deck_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================

-- Table: card_category_membership - Relations cartes ↔ catégories
CREATE TABLE IF NOT EXISTS card_category_membership (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  category_id UUID REFERENCES card_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (card_id, category_id)
);

COMMENT ON TABLE card_category_membership IS 'Table de liaison : une carte peut appartenir à plusieurs catégories';

-- Index
CREATE INDEX idx_card_category_card ON card_category_membership(card_id);
CREATE INDEX idx_card_category_category ON card_category_membership(category_id);

-- RLS
ALTER TABLE card_category_membership ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view category membership for own decks"
  ON card_category_membership FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN decks d ON c.deck_id = d.id
      WHERE c.id = card_category_membership.card_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage category membership for own decks"
  ON card_category_membership FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN decks d ON c.deck_id = d.id
      WHERE c.id = card_category_membership.card_id
      AND d.user_id = auth.uid()
    )
  );

-- ============================================================================

-- Table: primitive_actions - Log des actions primitives
CREATE TABLE IF NOT EXISTS primitive_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,

  -- Payload de l'action
  card_ids UUID[],
  source_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  target_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  target_player_id UUID REFERENCES game_players(id) ON DELETE SET NULL,

  -- Metadata
  face_visible BOOLEAN,
  count INTEGER,
  points INTEGER,
  parameters JSONB DEFAULT '{}',

  -- Undo
  can_be_undone BOOLEAN DEFAULT true,
  undone_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE primitive_actions IS 'Historique de toutes les actions primitives exécutées dans la partie';
COMMENT ON COLUMN primitive_actions.action_type IS 'Type de primitive (REVEAL_TOP_CARD, ASSIGN_TO_PLAYER, etc.)';
COMMENT ON COLUMN primitive_actions.can_be_undone IS 'Si false, action ne peut pas être annulée';

-- Index
CREATE INDEX idx_primitive_actions_game ON primitive_actions(game_id, created_at DESC);
CREATE INDEX idx_primitive_actions_actor ON primitive_actions(actor_id);
CREATE INDEX idx_primitive_actions_type ON primitive_actions(game_id, action_type);

-- RLS
ALTER TABLE primitive_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view actions in their games"
  ON primitive_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = primitive_actions.game_id
      AND (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

CREATE POLICY "Players and GM can insert actions"
  ON primitive_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = primitive_actions.game_id
      AND (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

-- ============================================================================

-- Table: game_rules_text - Règles textuelles du jeu
CREATE TABLE IF NOT EXISTS game_rules_text (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  rules_markdown TEXT,
  game_name TEXT,
  predefined_game_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE game_rules_text IS 'Règles du jeu en texte markdown (affichage uniquement, pas de logique)';
COMMENT ON COLUMN game_rules_text.predefined_game_id IS 'ID du jeu prédéfini si chargé depuis bibliothèque';

-- RLS
ALTER TABLE game_rules_text ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view rules in their games"
  ON game_rules_text FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = game_rules_text.game_id
      AND (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

CREATE POLICY "Game master can manage rules"
  ON game_rules_text FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM game_master
      WHERE game_id = game_rules_text.game_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================

-- Table: turn_state - État du système de tours
CREATE TABLE IF NOT EXISTS turn_state (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  current_player_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
  turn_order UUID[] DEFAULT '{}',
  direction TEXT DEFAULT 'CLOCKWISE' CHECK (direction IN ('CLOCKWISE', 'COUNTER_CLOCKWISE')),
  turn_number INTEGER DEFAULT 1,
  timer_seconds INTEGER,
  timer_started_at TIMESTAMPTZ,
  is_paused BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE turn_state IS 'État complet du système de gestion des tours';
COMMENT ON COLUMN turn_state.turn_order IS 'Array d''IDs game_players dans l''ordre de jeu';
COMMENT ON COLUMN turn_state.timer_seconds IS 'NULL = pas de timer, sinon durée en secondes';

-- Index
CREATE INDEX idx_turn_state_current_player ON turn_state(current_player_id);

-- RLS
ALTER TABLE turn_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view turn state in their games"
  ON turn_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = turn_state.game_id
      AND (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

CREATE POLICY "Game master can manage turn state"
  ON turn_state FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM game_master
      WHERE game_id = turn_state.game_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================

-- Table: card_groups - Groupes de cartes
CREATE TABLE IF NOT EXISTS card_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT,
  card_ids UUID[] NOT NULL,
  owner_player_id UUID REFERENCES game_players(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE card_groups IS 'Groupes de cartes (brelan, suite, combinaison)';
COMMENT ON COLUMN card_groups.card_ids IS 'Array d''IDs cartes du groupe';

-- Index
CREATE INDEX idx_card_groups_game ON card_groups(game_id);
CREATE INDEX idx_card_groups_owner ON card_groups(owner_player_id);

-- RLS
ALTER TABLE card_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view groups in their games"
  ON card_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = card_groups.game_id
      AND (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

CREATE POLICY "Players can manage own groups"
  ON card_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM game_players gp
      WHERE gp.id = card_groups.owner_player_id
      AND (gp.user_id = auth.uid() OR gp.guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

-- ============================================================================
-- 2. MODIFICATIONS TABLES EXISTANTES
-- ============================================================================

-- Table: games - Ajout colonnes v2
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS game_master_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'UNIVERSAL';

-- Supprimer colonnes obsolètes
ALTER TABLE games
  DROP COLUMN IF EXISTS current_phase_id,
  DROP COLUMN IF EXISTS current_turn_player_id,
  DROP COLUMN IF EXISTS current_turn_guest_id;

COMMENT ON COLUMN games.game_master_id IS 'Utilisateur qui est le Maître du Jeu';
COMMENT ON COLUMN games.current_round IS 'Numéro de la manche/donne actuelle';
COMMENT ON COLUMN games.game_mode IS 'Toujours UNIVERSAL en v2';

-- Index
CREATE INDEX IF NOT EXISTS idx_games_game_master ON games(game_master_id);

-- ============================================================================

-- Table: game_players - Ajout colonnes v2
ALTER TABLE game_players
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'PLAYER' CHECK (role IN ('GM', 'PLAYER', 'SPECTATOR')),
  ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

COMMENT ON COLUMN game_players.role IS 'Rôle du joueur : GM (Maître), PLAYER (joueur), SPECTATOR (observateur)';
COMMENT ON COLUMN game_players.score IS 'Score du joueur (géré par MJ)';

-- Index
CREATE INDEX IF NOT EXISTS idx_game_players_role ON game_players(game_id, role);

-- ============================================================================

-- Table: game_cards - Simplification et ajout colonnes
ALTER TABLE game_cards
  RENAME COLUMN location TO zone_id;

ALTER TABLE game_cards
  ADD COLUMN IF NOT EXISTS face_visible BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES card_groups(id) ON DELETE SET NULL;

-- Renommer colonnes propriétaire
ALTER TABLE game_cards
  RENAME COLUMN owner_user_id TO owner_id;

ALTER TABLE game_cards
  DROP COLUMN IF EXISTS owner_guest_session_id;

COMMENT ON COLUMN game_cards.zone_id IS 'ID de la zone où se trouve la carte';
COMMENT ON COLUMN game_cards.face_visible IS 'true = face visible, false = face cachée';
COMMENT ON COLUMN game_cards.group_id IS 'ID du groupe si carte fait partie d''un groupe';

-- Index
CREATE INDEX IF NOT EXISTS idx_game_cards_zone ON game_cards(zone_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_owner ON game_cards(owner_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_group ON game_cards(group_id);

-- ============================================================================

-- Table: cards - Ajout valeurs numériques
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS numeric_values JSONB DEFAULT '{}';

COMMENT ON COLUMN cards.numeric_values IS 'Valeurs numériques multiples (ex: {"base": 7, "scoring": 10, "trump": 14})';

-- Index pour recherche dans JSONB
CREATE INDEX IF NOT EXISTS idx_cards_numeric_values ON cards USING GIN (numeric_values);

-- ============================================================================
-- 3. FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction: Créer zones par défaut pour une partie
CREATE OR REPLACE FUNCTION create_default_zones(p_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Zone DECK (pioche)
  INSERT INTO zones (game_id, name, type, visibility, default_face, is_ordered, max_capacity)
  VALUES (p_game_id, 'Pioche', 'DECK', 'PRIVATE', 'HIDDEN', true, NULL);

  -- Zone CENTER (tapis central)
  INSERT INTO zones (game_id, name, type, visibility, default_face, is_ordered, max_capacity)
  VALUES (p_game_id, 'Centre', 'CENTER', 'ALL', 'VISIBLE', false, NULL);

  -- Zone DISCARD (défausse)
  INSERT INTO zones (game_id, name, type, visibility, default_face, is_ordered, max_capacity)
  VALUES (p_game_id, 'Défausse', 'DISCARD', 'ALL', 'VISIBLE', true, NULL);
END;
$$;

COMMENT ON FUNCTION create_default_zones IS 'Crée les 3 zones par défaut (pioche, centre, défausse) pour une nouvelle partie';

-- ============================================================================

-- Fonction: Créer zone HAND pour un joueur
CREATE OR REPLACE FUNCTION create_player_hand_zone(p_game_id UUID, p_player_id UUID, p_player_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_zone_id UUID;
BEGIN
  INSERT INTO zones (game_id, name, type, visibility, default_face, is_ordered, owner_player_id, max_capacity)
  VALUES (p_game_id, 'Main de ' || p_player_name, 'HAND', 'OWNER', 'HIDDEN', false, p_player_id, NULL)
  RETURNING id INTO v_zone_id;

  RETURN v_zone_id;
END;
$$;

COMMENT ON FUNCTION create_player_hand_zone IS 'Crée une zone HAND personnalisée pour un joueur';

-- ============================================================================

-- Fonction: Obtenir le joueur suivant dans l'ordre
CREATE OR REPLACE FUNCTION get_next_player(p_game_id UUID, p_current_player_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_turn_order UUID[];
  v_direction TEXT;
  v_current_index INTEGER;
  v_next_index INTEGER;
  v_next_player_id UUID;
BEGIN
  -- Récupérer état des tours
  SELECT turn_order, direction
  INTO v_turn_order, v_direction
  FROM turn_state
  WHERE game_id = p_game_id;

  -- Trouver index actuel
  v_current_index := array_position(v_turn_order, p_current_player_id);

  IF v_current_index IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculer index suivant selon direction
  IF v_direction = 'CLOCKWISE' THEN
    v_next_index := (v_current_index % array_length(v_turn_order, 1)) + 1;
  ELSE -- COUNTER_CLOCKWISE
    v_next_index := CASE
      WHEN v_current_index = 1 THEN array_length(v_turn_order, 1)
      ELSE v_current_index - 1
    END;
  END IF;

  v_next_player_id := v_turn_order[v_next_index];

  RETURN v_next_player_id;
END;
$$;

COMMENT ON FUNCTION get_next_player IS 'Calcule le prochain joueur dans l''ordre selon la direction actuelle';

-- ============================================================================

-- Fonction: Initialiser turn_state pour une partie
CREATE OR REPLACE FUNCTION initialize_turn_state(p_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player_ids UUID[];
BEGIN
  -- Récupérer ordre des joueurs
  SELECT array_agg(id ORDER BY player_order)
  INTO v_player_ids
  FROM game_players
  WHERE game_id = p_game_id
  AND role = 'PLAYER'
  AND is_active = true;

  -- Créer turn_state
  INSERT INTO turn_state (game_id, turn_order, current_player_id, direction, turn_number)
  VALUES (p_game_id, v_player_ids, NULL, 'CLOCKWISE', 1);
END;
$$;

COMMENT ON FUNCTION initialize_turn_state IS 'Initialise le système de tours avec tous les joueurs actifs';

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Trigger: Auto-créer zones quand partie démarre
CREATE OR REPLACE FUNCTION trigger_create_default_zones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'playing' AND OLD.status = 'waiting' THEN
    PERFORM create_default_zones(NEW.id);
    PERFORM initialize_turn_state(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_game_start_create_zones ON games;
CREATE TRIGGER on_game_start_create_zones
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_zones();

-- ============================================================================

-- Trigger: Auto-créer zone HAND quand joueur rejoint
CREATE OR REPLACE FUNCTION trigger_create_player_hand()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game_status TEXT;
BEGIN
  -- Vérifier si partie en cours
  SELECT status INTO v_game_status
  FROM games
  WHERE id = NEW.game_id;

  IF v_game_status = 'playing' AND NEW.role = 'PLAYER' THEN
    PERFORM create_player_hand_zone(NEW.game_id, NEW.id, NEW.name);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_player_join_create_hand ON game_players;
CREATE TRIGGER on_player_join_create_hand
  AFTER INSERT ON game_players
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_player_hand();

-- ============================================================================

-- Trigger: Mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer aux tables avec updated_at
DROP TRIGGER IF EXISTS update_zones_updated_at ON zones;
CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_turn_state_updated_at ON turn_state;
CREATE TRIGGER update_turn_state_updated_at
  BEFORE UPDATE ON turn_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_rules_updated_at ON game_rules_text;
CREATE TRIGGER update_game_rules_updated_at
  BEFORE UPDATE ON game_rules_text
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. DONNÉES PAR DÉFAUT
-- ============================================================================

-- Aucune donnée par défaut (parties créées dynamiquement)

-- ============================================================================
-- FIN MIGRATION
-- ============================================================================

COMMENT ON SCHEMA public IS 'PlayDeck v2 - Moteur Universel de Jeu de Cartes - Migration du 2026-02-11';
