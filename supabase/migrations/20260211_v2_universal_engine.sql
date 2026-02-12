-- Migration v2 : Moteur Universel de Jeu de Cartes
-- Date: 2026-02-11
-- Description: Refonte complète pour système MJ + primitives

-- ============================================================================
-- 1. NOUVELLES TABLES
-- ============================================================================

-- Table: game_master - Configuration du Maître du Jeu
CREATE TABLE IF NOT EXISTS game_master (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_playing BOOLEAN DEFAULT false,
  omniscient_mode BOOLEAN DEFAULT true,
  can_undo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE game_master IS 'Configuration du rôle Maître du Jeu pour chaque partie';
COMMENT ON COLUMN game_master.is_playing IS 'Le MJ participe comme joueur ou arbitre uniquement';
COMMENT ON COLUMN game_master.omniscient_mode IS 'Le MJ voit toutes les cartes de toutes les zones';

-- Index
CREATE INDEX IF NOT EXISTS idx_game_master_user ON game_master(user_id);

-- RLS
ALTER TABLE game_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Game master can view own games" ON game_master;
CREATE POLICY "Game master can view own games"
  ON game_master FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Game master can insert own games" ON game_master;
CREATE POLICY "Game master can insert own games"
  ON game_master FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Game master can update own games" ON game_master;
CREATE POLICY "Game master can update own games"
  ON game_master FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================

-- Table: zones - Zones dynamiques de jeu (REFONTE COMPLÈTE)
-- IMPORTANT: Ne pas supprimer la table zones si elle existe déjà
-- La structure v2 est compatible, les données existantes sont préservées
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DECK', 'HAND', 'CENTER', 'DISCARD', 'CUSTOM')),

  -- Propriétés de visibilité
  visibility TEXT DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'OWNER', 'ALL', 'GM_ONLY')),
  default_face TEXT DEFAULT 'HIDDEN' CHECK (default_face IN ('VISIBLE', 'HIDDEN')),

  -- Propriétés de capacité
  is_ordered BOOLEAN DEFAULT true,
  max_capacity INTEGER CHECK (max_capacity IS NULL OR max_capacity > 0), -- NULL = illimité

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
CREATE INDEX IF NOT EXISTS idx_zones_game ON zones(game_id);
CREATE INDEX IF NOT EXISTS idx_zones_type ON zones(game_id, type);
CREATE INDEX IF NOT EXISTS idx_zones_owner ON zones(owner_player_id);
CREATE INDEX IF NOT EXISTS idx_zones_enabled ON zones(game_id) WHERE is_enabled = true;

-- Contrainte unique sur nom de zone par partie (évite confusion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'zones_game_name_unique'
  ) THEN
    ALTER TABLE zones ADD CONSTRAINT zones_game_name_unique UNIQUE (game_id, name);
  END IF;
END $$;

-- RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view zones in their games" ON zones;
CREATE POLICY "Players can view zones in their games"
  ON zones FOR SELECT
  USING (
    -- Le joueur doit être dans la partie
    EXISTS (
      SELECT 1 FROM game_players gp
      WHERE gp.game_id = zones.game_id
      AND (gp.user_id = auth.uid() OR gp.guest_session_id = current_setting('app.guest_session_id', true))
    )
    AND (
      -- Visibilité ALL: tout le monde voit
      zones.visibility = 'ALL'
      -- Visibilité OWNER: seul le propriétaire voit
      OR (zones.visibility = 'OWNER' AND zones.owner_player_id IN (
        SELECT id FROM game_players WHERE user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true)
      ))
      -- Visibilité GM_ONLY: seul le GM voit (géré par policy GM)
      OR (zones.visibility = 'GM_ONLY' AND EXISTS (
        SELECT 1 FROM game_master WHERE game_id = zones.game_id AND user_id = auth.uid()
      ))
      -- Visibilité PRIVATE: zone globale visible par tous
      OR (zones.visibility = 'PRIVATE' AND zones.owner_player_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Game master can manage zones" ON zones;
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
CREATE INDEX IF NOT EXISTS idx_card_categories_deck ON card_categories(deck_id);

-- RLS
ALTER TABLE card_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories in own decks" ON card_categories;
CREATE POLICY "Users can view categories in own decks"
  ON card_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM decks
      WHERE id = card_categories.deck_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage categories in own decks" ON card_categories;
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
CREATE INDEX IF NOT EXISTS idx_card_category_card ON card_category_membership(card_id);
CREATE INDEX IF NOT EXISTS idx_card_category_category ON card_category_membership(category_id);

-- RLS
ALTER TABLE card_category_membership ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view category membership for own decks" ON card_category_membership;
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

DROP POLICY IF EXISTS "Users can manage category membership for own decks" ON card_category_membership;
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
CREATE INDEX IF NOT EXISTS idx_primitive_actions_game ON primitive_actions(game_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_primitive_actions_actor ON primitive_actions(actor_id);
CREATE INDEX IF NOT EXISTS idx_primitive_actions_type ON primitive_actions(game_id, action_type);
CREATE INDEX IF NOT EXISTS idx_primitive_actions_undone ON primitive_actions(game_id) WHERE undone_at IS NULL;

-- RLS
ALTER TABLE primitive_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view actions in their games" ON primitive_actions;
CREATE POLICY "Players can view actions in their games"
  ON primitive_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = primitive_actions.game_id
      AND (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

DROP POLICY IF EXISTS "Players and GM can insert actions" ON primitive_actions;
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

DROP POLICY IF EXISTS "Players can view rules in their games" ON game_rules_text;
CREATE POLICY "Players can view rules in their games"
  ON game_rules_text FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = game_rules_text.game_id
      AND (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

DROP POLICY IF EXISTS "Game master can manage rules" ON game_rules_text;
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
  turn_number INTEGER DEFAULT 1 CHECK (turn_number >= 1),
  timer_seconds INTEGER CHECK (timer_seconds IS NULL OR timer_seconds > 0),
  timer_started_at TIMESTAMPTZ,
  is_paused BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE turn_state IS 'État complet du système de gestion des tours';
COMMENT ON COLUMN turn_state.turn_order IS 'Array d''IDs game_players dans l''ordre de jeu';
COMMENT ON COLUMN turn_state.timer_seconds IS 'NULL = pas de timer, sinon durée en secondes';

-- Index
CREATE INDEX IF NOT EXISTS idx_turn_state_current_player ON turn_state(current_player_id);

-- RLS
ALTER TABLE turn_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view turn state in their games" ON turn_state;
CREATE POLICY "Players can view turn state in their games"
  ON turn_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = turn_state.game_id
      AND (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

DROP POLICY IF EXISTS "Game master can manage turn state" ON turn_state;
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
CREATE INDEX IF NOT EXISTS idx_card_groups_game ON card_groups(game_id);
CREATE INDEX IF NOT EXISTS idx_card_groups_owner ON card_groups(owner_player_id);

-- RLS
ALTER TABLE card_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view groups in their games" ON card_groups;
CREATE POLICY "Players can view groups in their games"
  ON card_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = card_groups.game_id
      AND (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

DROP POLICY IF EXISTS "Players can manage own groups" ON card_groups;
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

-- Table: games - Supprimer anciennes policies avant de supprimer colonnes
DROP POLICY IF EXISTS "games_select_participant" ON games;
DROP POLICY IF EXISTS "games_insert_policy" ON games;
DROP POLICY IF EXISTS "games_update_policy" ON games;
DROP POLICY IF EXISTS "games_delete_policy" ON games;

-- Table: games - Ajout colonnes v2
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS game_master_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'UNIVERSAL';

-- Rendre deck_id nullable (v2 permet parties sans deck prédéfini)
ALTER TABLE games
  ALTER COLUMN deck_id DROP NOT NULL;

-- Supprimer colonnes obsolètes
ALTER TABLE games
  DROP COLUMN IF EXISTS host_id,
  DROP COLUMN IF EXISTS current_phase_id,
  DROP COLUMN IF EXISTS current_turn_player_id,
  DROP COLUMN IF EXISTS current_turn_guest_id;

COMMENT ON COLUMN games.game_master_id IS 'Utilisateur qui est le Maître du Jeu';
COMMENT ON COLUMN games.current_round IS 'Numéro de la manche/donne actuelle';
COMMENT ON COLUMN games.game_mode IS 'Toujours UNIVERSAL en v2';

-- Index
CREATE INDEX IF NOT EXISTS idx_games_game_master ON games(game_master_id);

-- Contrainte unique sur code de partie
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'games_code_unique'
  ) THEN
    ALTER TABLE games ADD CONSTRAINT games_code_unique UNIQUE (code);
  END IF;
END $$;

-- RLS pour games (recréer avec game_master_id)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view games they participate in" ON games;
CREATE POLICY "Players can view games they participate in"
  ON games FOR SELECT
  USING (
    status = 'public'
    OR game_master_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = games.id
      AND (game_players.user_id = auth.uid() OR game_players.guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

DROP POLICY IF EXISTS "Game master can create games" ON games;
CREATE POLICY "Game master can create games"
  ON games FOR INSERT
  WITH CHECK (game_master_id = auth.uid());

DROP POLICY IF EXISTS "Game master can update own games" ON games;
CREATE POLICY "Game master can update own games"
  ON games FOR UPDATE
  USING (game_master_id = auth.uid());

DROP POLICY IF EXISTS "Game master can delete own games" ON games;
CREATE POLICY "Game master can delete own games"
  ON games FOR DELETE
  USING (game_master_id = auth.uid());

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
-- Renommer location → zone_id si la colonne existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_cards' AND column_name = 'location'
  ) THEN
    ALTER TABLE game_cards RENAME COLUMN location TO zone_id;
  END IF;
END $$;

-- Supprimer l'ancienne FK constraint sur zone_id si elle existe (après rename de location)
-- et la recréer avec ON DELETE CASCADE pour assurer la cohérence
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Trouver le nom de la contrainte FK sur zone_id
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'game_cards'
    AND tc.table_schema = 'public'
    AND kcu.column_name = 'zone_id'
    AND tc.constraint_type = 'FOREIGN KEY';

  -- Supprimer l'ancienne contrainte si elle existe
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE game_cards DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Convertir zone_id de TEXT vers UUID si nécessaire (après rename de location)
-- Gère aussi la contrainte NOT NULL qui peut exister
DO $$
DECLARE
  current_type text;
  was_not_null boolean;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'game_cards' AND column_name = 'zone_id';

  IF current_type = 'text' OR current_type = 'character varying' THEN
    -- Vérifier si la colonne avait NOT NULL
    SELECT is_nullable = 'NO' INTO was_not_null
    FROM information_schema.columns
    WHERE table_name = 'game_cards' AND column_name = 'zone_id';

    -- Supprimer temporairement NOT NULL si elle existe
    IF was_not_null THEN
      ALTER TABLE game_cards ALTER COLUMN zone_id DROP NOT NULL;
    END IF;

    -- Supprimer les valeurs qui ne sont pas des UUID valides
    UPDATE game_cards
    SET zone_id = NULL
    WHERE zone_id IS NOT NULL
      AND zone_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- Convertir la colonne en UUID
    ALTER TABLE game_cards
    ALTER COLUMN zone_id TYPE UUID USING zone_id::uuid;

    -- Note: On ne remet PAS NOT NULL car les cartes peuvent temporairement ne pas avoir de zone
  END IF;
END $$;

-- Ajouter zone_id si elle n'existe pas (pour installations fraîches)
ALTER TABLE game_cards
  ADD COLUMN IF NOT EXISTS zone_id UUID;

-- Ajouter la FK constraint avec ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'game_cards'
      AND tc.table_schema = 'public'
      AND kcu.column_name = 'zone_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE game_cards
      ADD CONSTRAINT game_cards_zone_id_fkey
      FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE game_cards
  ADD COLUMN IF NOT EXISTS face_visible BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES card_groups(id) ON DELETE SET NULL;

-- Renommer owner_user_id → owner_id si la colonne existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_cards' AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE game_cards RENAME COLUMN owner_user_id TO owner_id;
  END IF;
END $$;

-- Ajouter owner_id si elle n'existe pas (pour installations fraîches)
ALTER TABLE game_cards
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES game_players(id) ON DELETE SET NULL;

ALTER TABLE game_cards
  DROP COLUMN IF EXISTS owner_guest_session_id;

COMMENT ON COLUMN game_cards.zone_id IS 'ID de la zone où se trouve la carte';
COMMENT ON COLUMN game_cards.face_visible IS 'true = face visible, false = face cachée';
COMMENT ON COLUMN game_cards.group_id IS 'ID du groupe si carte fait partie d''un groupe';

-- Index
CREATE INDEX IF NOT EXISTS idx_game_cards_zone ON game_cards(zone_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_owner ON game_cards(owner_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_group ON game_cards(group_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_visible ON game_cards(game_id, face_visible);

-- ============================================================================

-- Table: cards - Ajout valeurs numériques
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS numeric_values JSONB DEFAULT '{}';

COMMENT ON COLUMN cards.numeric_values IS 'Valeurs numériques multiples (ex: {"base": 7, "scoring": 10, "trump": 14})';

-- Index pour recherche dans JSONB
CREATE INDEX IF NOT EXISTS idx_cards_numeric_values ON cards USING GIN (numeric_values);

-- ============================================================================

-- Table: card_marks - Marquages visuels sur cartes (P2 - MAR-01/02)
CREATE TABLE IF NOT EXISTS card_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES game_cards(id) ON DELETE CASCADE,
  mark_type TEXT NOT NULL CHECK (mark_type IN ('BADGE', 'COLOR', 'ICON')),
  mark_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE card_marks IS 'Marquages visuels sur cartes (badge, couleur, icône)';

-- Index
CREATE INDEX IF NOT EXISTS idx_card_marks_game ON card_marks(game_id);
CREATE INDEX IF NOT EXISTS idx_card_marks_card ON card_marks(game_id, card_id);

-- RLS
ALTER TABLE card_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view marks in their games" ON card_marks;
CREATE POLICY "Players can view marks in their games"
  ON card_marks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = card_marks.game_id
      AND (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

DROP POLICY IF EXISTS "Game master can manage marks" ON card_marks;
CREATE POLICY "Game master can manage marks"
  ON card_marks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM game_master
      WHERE game_id = card_marks.game_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================

-- Table: game_snapshots - Sauvegardes de parties (P2 - PAR-07)
CREATE TABLE IF NOT EXISTS game_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  version TEXT DEFAULT '2.0.0',
  checksum TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE game_snapshots IS 'Snapshots de sauvegardes de parties complètes';
COMMENT ON COLUMN game_snapshots.snapshot_data IS 'État complet de la partie en JSON';
COMMENT ON COLUMN game_snapshots.checksum IS 'Hash MD5 pour validation intégrité';

-- Index
CREATE INDEX IF NOT EXISTS idx_game_snapshots_game ON game_snapshots(game_id, created_at DESC);

-- RLS
ALTER TABLE game_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Game master can manage snapshots" ON game_snapshots;
CREATE POLICY "Game master can manage snapshots"
  ON game_snapshots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM game_master gm
      JOIN games g ON gm.game_id = g.id
      WHERE g.id = game_snapshots.game_id
      AND gm.user_id = auth.uid()
    )
  );

-- ============================================================================

-- Table: predefined_games - Jeux prédéfinis (P2 - REG-03, IAM-01)
CREATE TABLE IF NOT EXISTS predefined_games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rules_markdown TEXT NOT NULL,
  deck_config JSONB NOT NULL,
  default_zones JSONB NOT NULL,
  default_turn_structure JSONB NOT NULL,
  default_settings JSONB,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE predefined_games IS 'Bibliothèque de jeux prédéfinis (Belote, Poker, Tarot, etc.)';
COMMENT ON COLUMN predefined_games.id IS 'Identifiant unique (ex: "belote-classique", "poker-texas")';

-- Index
CREATE INDEX IF NOT EXISTS idx_predefined_games_public ON predefined_games(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predefined_games_creator ON predefined_games(created_by);

-- RLS
ALTER TABLE predefined_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public games are viewable by all" ON predefined_games;
CREATE POLICY "Public games are viewable by all"
  ON predefined_games FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

DROP POLICY IF EXISTS "Users can create predefined games" ON predefined_games;
CREATE POLICY "Users can create predefined games"
  ON predefined_games FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own predefined games" ON predefined_games;
CREATE POLICY "Users can update own predefined games"
  ON predefined_games FOR UPDATE
  USING (created_by = auth.uid());

-- ============================================================================

-- Table: player_visibility_overrides - Surcharges visibilité (P1 - VIS-03, VIS-04)
CREATE TABLE IF NOT EXISTS player_visibility_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  viewer_player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  target_player_id UUID REFERENCES game_players(id) ON DELETE CASCADE, -- NULL = open game
  can_see_hand BOOLEAN DEFAULT false,
  can_see_all_zones BOOLEAN DEFAULT false,
  hide_own_cards BOOLEAN DEFAULT false, -- P2 - VIS-05
  expires_at TIMESTAMPTZ, -- NULL = permanent
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE player_visibility_overrides IS 'Surcharges temporaires ou permanentes de visibilité';
COMMENT ON COLUMN player_visibility_overrides.target_player_id IS 'NULL = jeu ouvert (tous voient tout)';
COMMENT ON COLUMN player_visibility_overrides.hide_own_cards IS 'P2: Cacher ses propres cartes au joueur';

-- Index
CREATE INDEX IF NOT EXISTS idx_visibility_overrides_game ON player_visibility_overrides(game_id);
CREATE INDEX IF NOT EXISTS idx_visibility_overrides_viewer ON player_visibility_overrides(viewer_player_id);

-- RLS
ALTER TABLE player_visibility_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view own visibility overrides" ON player_visibility_overrides;
CREATE POLICY "Players can view own visibility overrides"
  ON player_visibility_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE id = player_visibility_overrides.viewer_player_id
      AND (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true))
    )
  );

DROP POLICY IF EXISTS "Game master can manage visibility overrides" ON player_visibility_overrides;
CREATE POLICY "Game master can manage visibility overrides"
  ON player_visibility_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM game_master
      WHERE game_id = player_visibility_overrides.game_id
      AND user_id = auth.uid()
    )
  );

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

  -- Valider que le turn_state existe
  IF v_turn_order IS NULL THEN
    RAISE EXCEPTION 'turn_state not found for game_id %', p_game_id;
  END IF;

  -- Valider que l'array n'est pas vide
  IF array_length(v_turn_order, 1) IS NULL OR array_length(v_turn_order, 1) = 0 THEN
    RAISE EXCEPTION 'turn_order is empty for game_id %', p_game_id;
  END IF;

  -- Trouver index actuel
  v_current_index := array_position(v_turn_order, p_current_player_id);

  IF v_current_index IS NULL THEN
    RAISE EXCEPTION 'player_id % not found in turn_order for game_id %', p_current_player_id, p_game_id;
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
  AND role = 'PLAYER';

  -- Valider qu'il y a au moins un joueur
  IF v_player_ids IS NULL OR array_length(v_player_ids, 1) IS NULL OR array_length(v_player_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No players found for game_id %. Cannot initialize turn_state without players.', p_game_id;
  END IF;

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

-- Fonction: Recycler défausse dans pioche (P1 - DEF-04)
CREATE OR REPLACE FUNCTION recycle_discard_to_deck(p_game_id UUID, p_shuffle BOOLEAN DEFAULT true)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_discard_zone_id UUID;
  v_deck_zone_id UUID;
  v_cards_moved INTEGER;
BEGIN
  -- Trouver zones
  SELECT id INTO v_discard_zone_id FROM zones WHERE game_id = p_game_id AND type = 'DISCARD';
  SELECT id INTO v_deck_zone_id FROM zones WHERE game_id = p_game_id AND type = 'DECK';

  -- Valider que les zones existent
  IF v_discard_zone_id IS NULL THEN
    RAISE EXCEPTION 'DISCARD zone not found for game_id %', p_game_id;
  END IF;

  IF v_deck_zone_id IS NULL THEN
    RAISE EXCEPTION 'DECK zone not found for game_id %', p_game_id;
  END IF;

  -- Déplacer cartes (retournera 0 si défausse vide, ce qui est un cas valide)
  UPDATE game_cards
  SET zone_id = v_deck_zone_id, position = 0
  WHERE zone_id = v_discard_zone_id;

  GET DIAGNOSTICS v_cards_moved = ROW_COUNT;

  -- Optionnel : déclencher mélange (sera fait par primitive SHUFFLE_DECK après)

  RETURN v_cards_moved;
END;
$$;

COMMENT ON FUNCTION recycle_discard_to_deck IS 'Déplace toutes les cartes de la défausse vers la pioche';

-- ============================================================================

-- Fonction: Distribuer des cartes aux joueurs
CREATE OR REPLACE FUNCTION distribute_cards(p_game_id UUID, p_cards_per_player INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deck_zone_id UUID;
  v_player RECORD;
  v_card RECORD;
  v_cards_dealt INTEGER := 0;
  v_position INTEGER;
BEGIN
  -- Trouver la zone DECK
  SELECT id INTO v_deck_zone_id
  FROM zones
  WHERE game_id = p_game_id AND type = 'DECK';

  IF v_deck_zone_id IS NULL THEN
    RAISE EXCEPTION 'DECK zone not found for game_id %', p_game_id;
  END IF;

  -- Pour chaque joueur actif
  FOR v_player IN
    SELECT gp.id as player_id, z.id as hand_zone_id
    FROM game_players gp
    JOIN zones z ON z.game_id = p_game_id
      AND z.type = 'HAND'
      AND z.owner_player_id = gp.id
    WHERE gp.game_id = p_game_id
      AND gp.role = 'PLAYER'
    ORDER BY gp.created_at
  LOOP
    -- Récupérer la position actuelle maximale dans la main du joueur
    SELECT COALESCE(MAX(position), -1) INTO v_position
    FROM game_cards
    WHERE zone_id = v_player.hand_zone_id;

    -- Distribuer p_cards_per_player cartes au joueur
    FOR v_card IN
      SELECT id
      FROM game_cards
      WHERE zone_id = v_deck_zone_id
      ORDER BY position
      LIMIT p_cards_per_player
    LOOP
      v_position := v_position + 1;

      UPDATE game_cards
      SET
        zone_id = v_player.hand_zone_id,
        owner_id = v_player.player_id,
        position = v_position
      WHERE id = v_card.id;

      v_cards_dealt := v_cards_dealt + 1;
    END LOOP;
  END LOOP;

  -- Réorganiser les positions des cartes restantes dans le DECK
  WITH remaining_cards AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 as new_position
    FROM game_cards
    WHERE zone_id = v_deck_zone_id
  )
  UPDATE game_cards gc
  SET position = rc.new_position
  FROM remaining_cards rc
  WHERE gc.id = rc.id;

  RETURN v_cards_dealt;
END;
$$;

COMMENT ON FUNCTION distribute_cards IS 'Distribue un nombre spécifique de cartes de la pioche à chaque joueur';

-- ============================================================================

-- Fonction: Calculer score automatique (P2 - SCO-02)
CREATE OR REPLACE FUNCTION calculate_player_score(p_game_id UUID, p_player_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score INTEGER := 0;
  v_card RECORD;
BEGIN
  -- Récupérer toutes cartes du joueur (dans toutes zones sauf DECK)
  FOR v_card IN
    SELECT gc.id, c.numeric_values
    FROM game_cards gc
    JOIN cards c ON gc.card_id = c.id
    WHERE gc.game_id = p_game_id
    AND gc.owner_id = p_player_id
    AND gc.zone_id NOT IN (SELECT id FROM zones WHERE game_id = p_game_id AND type = 'DECK')
  LOOP
    -- Ajouter valeur "scoring" si elle existe (avec validation)
    IF v_card.numeric_values ? 'scoring' THEN
      v_score := v_score + COALESCE((v_card.numeric_values->>'scoring')::INTEGER, 0);
    ELSIF v_card.numeric_values ? 'base' THEN
      v_score := v_score + COALESCE((v_card.numeric_values->>'base')::INTEGER, 0);
    END IF;
  END LOOP;

  RETURN v_score;
END;
$$;

COMMENT ON FUNCTION calculate_player_score IS 'Calcule automatiquement le score d''un joueur basé sur numeric_values des cartes';

-- ============================================================================

-- Fonction: Créer snapshot de partie (P2 - PAR-07)
CREATE OR REPLACE FUNCTION create_game_snapshot(p_game_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id UUID;
  v_snapshot_data JSONB;
  v_checksum TEXT;
BEGIN
  -- Construire snapshot JSON complet
  SELECT jsonb_build_object(
    'game', row_to_json(g.*),
    'gameMaster', row_to_json(gm.*),
    'players', (SELECT jsonb_agg(row_to_json(gp.*)) FROM game_players gp WHERE gp.game_id = p_game_id),
    'zones', (SELECT jsonb_agg(row_to_json(z.*)) FROM zones z WHERE z.game_id = p_game_id),
    'cards', (SELECT jsonb_agg(row_to_json(gc.*)) FROM game_cards gc WHERE gc.game_id = p_game_id),
    'turnState', row_to_json(ts.*),
    'rules', row_to_json(gr.*),
    'actionsHistory', (SELECT jsonb_agg(row_to_json(pa.*) ORDER BY pa.created_at) FROM primitive_actions pa WHERE pa.game_id = p_game_id)
  )
  INTO v_snapshot_data
  FROM games g
  LEFT JOIN game_master gm ON gm.game_id = g.id
  LEFT JOIN turn_state ts ON ts.game_id = g.id
  LEFT JOIN game_rules_text gr ON gr.game_id = g.id
  WHERE g.id = p_game_id;

  -- Calculer checksum
  v_checksum := md5(v_snapshot_data::TEXT);

  -- Insérer snapshot
  INSERT INTO game_snapshots (game_id, snapshot_data, checksum)
  VALUES (p_game_id, v_snapshot_data, v_checksum)
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION create_game_snapshot IS 'Crée un snapshot complet de l''état de la partie';

-- ============================================================================
-- 5. DONNÉES PAR DÉFAUT
-- ============================================================================

-- Insérer jeux prédéfinis de base
INSERT INTO predefined_games (id, name, description, rules_markdown, deck_config, default_zones, default_turn_structure, default_settings, is_public)
VALUES
(
  'bataille-classique',
  'Bataille Classique',
  'Jeu de bataille simple avec deck 52 cartes',
  '# Bataille\n\nChaque joueur retourne une carte. Le plus fort remporte les cartes.\n\nEn cas d''égalité : bataille !',
  '{"game_mode": "TURN_BASED", "min_players": 2, "max_players": 2}'::jsonb,
  '[]'::jsonb,
  '{"turn_order": "CLOCKWISE", "phases": [{"id": "main", "name": "Tour", "allowed_actions": ["FLIP_CARD", "PASS_TURN"], "auto_pass": false}]}'::jsonb,
  '{}'::jsonb,
  true
),
(
  'uno-simple',
  'Uno Simplifié',
  'Variante simplifiée du Uno',
  '# Uno Simplifié\n\nDéfaussez vos cartes en respectant couleur ou valeur.\n\nPremier à vider sa main gagne !',
  '{"game_mode": "TURN_BASED", "min_players": 2, "max_players": 6}'::jsonb,
  '[]'::jsonb,
  '{"turn_order": "CLOCKWISE", "phases": [{"id": "main", "name": "Tour", "allowed_actions": ["PLAY_TO_CENTER", "DRAW_TOP", "PASS_TURN"], "auto_pass": false}]}'::jsonb,
  '{}'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE predefined_games IS 'Jeux prédéfinis incluant Bataille et Uno par défaut';

-- ============================================================================
-- 5. VALIDATION TRIGGERS POUR ARRAYS
-- ============================================================================

-- Fonction: Valider que les UUIDs dans turn_order existent dans game_players
CREATE OR REPLACE FUNCTION validate_turn_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_invalid_count INTEGER;
  v_array_length INTEGER;
  v_distinct_count INTEGER;
BEGIN
  -- Vérifier que turn_order n'est pas NULL
  IF NEW.turn_order IS NULL THEN
    RAISE EXCEPTION 'turn_order cannot be NULL';
  END IF;

  -- Vérifier que turn_order n'est pas vide
  v_array_length := array_length(NEW.turn_order, 1);
  IF v_array_length IS NULL OR v_array_length = 0 THEN
    RAISE EXCEPTION 'turn_order cannot be empty - must have at least one player';
  END IF;

  -- Vérifier qu'il n'y a pas de doublons
  SELECT COUNT(DISTINCT unnest) INTO v_distinct_count FROM unnest(NEW.turn_order);
  IF v_distinct_count < v_array_length THEN
    RAISE EXCEPTION 'turn_order contains duplicate player IDs';
  END IF;

  -- Vérifier que tous les IDs dans turn_order sont des joueurs valides
  SELECT COUNT(*)
  INTO v_invalid_count
  FROM unnest(NEW.turn_order) AS player_id
  WHERE NOT EXISTS (
    SELECT 1 FROM game_players
    WHERE id = player_id
    AND game_id = NEW.game_id
    AND role = 'PLAYER'
  );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'turn_order contains % invalid player IDs', v_invalid_count;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_turn_order IS 'Valide que turn_order contient uniquement des IDs de joueurs existants, sans doublons, et n''est ni NULL ni vide';

-- Trigger pour valider turn_order
DROP TRIGGER IF EXISTS validate_turn_order_trigger ON turn_state;
CREATE TRIGGER validate_turn_order_trigger
  BEFORE INSERT OR UPDATE ON turn_state
  FOR EACH ROW
  EXECUTE FUNCTION validate_turn_order();

-- Fonction: Valider que les UUIDs dans card_ids existent dans game_cards
CREATE OR REPLACE FUNCTION validate_card_group_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_invalid_count INTEGER;
BEGIN
  -- Vérifier que tous les IDs dans card_ids sont des cartes valides
  SELECT COUNT(*)
  INTO v_invalid_count
  FROM unnest(NEW.card_ids) AS card_id
  WHERE NOT EXISTS (
    SELECT 1 FROM game_cards
    WHERE id = card_id
    AND game_id = NEW.game_id
  );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'card_ids contains % invalid card IDs', v_invalid_count;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_card_group_ids IS 'Valide que card_ids contient uniquement des IDs de cartes existantes';

-- Trigger pour valider card_ids
DROP TRIGGER IF EXISTS validate_card_ids_trigger ON card_groups;
CREATE TRIGGER validate_card_ids_trigger
  BEFORE INSERT OR UPDATE ON card_groups
  FOR EACH ROW
  WHEN (NEW.card_ids IS NOT NULL AND array_length(NEW.card_ids, 1) > 0)
  EXECUTE FUNCTION validate_card_group_ids();

-- ============================================================================

-- ============================================================================
-- FIN MIGRATION
-- ============================================================================

COMMENT ON SCHEMA public IS 'PlayDeck v2 - Moteur Universel de Jeu de Cartes - Migration du 2026-02-11';
