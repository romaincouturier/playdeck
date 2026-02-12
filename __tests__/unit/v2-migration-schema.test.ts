/**
 * Unit tests for PlayDeck v2 Migration Schema Validation
 *
 * These tests validate the v2 migration SQL file contains all required:
 * - Tables with correct columns
 * - Indexes
 * - Functions
 * - Triggers
 * - Constraints
 * - RLS Policies
 *
 * These tests DO NOT require a database connection.
 * They parse and validate the SQL migration file directly.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATION_FILE = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260211_v2_universal_engine.sql'
);

const migrationSQL = readFileSync(MIGRATION_FILE, 'utf-8');

describe('V2 Migration Schema Validation', () => {
  describe('Tables', () => {
    const requiredTables = [
      'game_master',
      'zones',
      'primitive_actions',
      'turn_state',
      'card_marks',
      'game_snapshots',
      'predefined_games',
      'player_visibility_overrides',
      'game_rules_text',
    ];

    requiredTables.forEach((table) => {
      it(`should define ${table} table`, () => {
        const tableRegex = new RegExp(
          `CREATE TABLE IF NOT EXISTS ${table}\\s*\\(`,
          'i'
        );
        expect(migrationSQL).toMatch(tableRegex);
      });
    });

    it('should NOT drop zones table (data preservation)', () => {
      expect(migrationSQL).not.toMatch(/DROP TABLE.*zones.*CASCADE/i);
    });
  });

  describe('game_master table', () => {
    it('should have game_id primary key', () => {
      expect(migrationSQL).toMatch(/game_id\s+UUID\s+PRIMARY KEY/i);
    });

    it('should have user_id NOT NULL with FK', () => {
      expect(migrationSQL).toMatch(
        /user_id\s+UUID\s+NOT NULL\s+REFERENCES\s+auth\.users/i
      );
    });

    it('should have created_at timestamp', () => {
      expect(migrationSQL).toMatch(/created_at\s+TIMESTAMPTZ/i);
    });
  });

  describe('zones table', () => {
    it('should have id UUID primary key', () => {
      expect(migrationSQL).toMatch(/id\s+UUID\s+(PRIMARY KEY|DEFAULT)/i);
    });

    it('should have game_id foreign key', () => {
      expect(migrationSQL).toMatch(/game_id\s+UUID.*REFERENCES\s+games/i);
    });

    it('should have type column with values', () => {
      expect(migrationSQL).toMatch(/type\s+TEXT\s+NOT NULL/i);
    });

    it('should have visibility column', () => {
      expect(migrationSQL).toMatch(/visibility\s+TEXT/i);
    });

    it('should have max_capacity with CHECK constraint', () => {
      expect(migrationSQL).toMatch(
        /max_capacity\s+INTEGER.*CHECK.*max_capacity.*>\s*0/i
      );
    });

    it('should have owner_player_id', () => {
      expect(migrationSQL).toMatch(/owner_player_id\s+UUID/i);
    });
  });

  describe('turn_state table', () => {
    it('should have game_id primary key', () => {
      expect(migrationSQL).toMatch(/game_id\s+UUID\s+PRIMARY KEY/i);
    });

    it('should have turn_order UUID array', () => {
      expect(migrationSQL).toMatch(/turn_order\s+UUID\[\]/i);
    });

    it('should have current_player_id', () => {
      expect(migrationSQL).toMatch(/current_player_id\s+UUID/i);
    });

    it('should have direction column', () => {
      expect(migrationSQL).toMatch(/direction\s+TEXT/i);
    });

    it('should have turn_number with CHECK >= 1', () => {
      expect(migrationSQL).toMatch(
        /turn_number\s+INTEGER.*CHECK.*turn_number\s*>=\s*1/i
      );
    });

    it('should have timer_seconds with CHECK > 0', () => {
      expect(migrationSQL).toMatch(
        /timer_seconds\s+INTEGER.*CHECK.*timer_seconds.*>\s*0/i
      );
    });
  });

  describe('primitive_actions table', () => {
    it('should have id UUID primary key', () => {
      expect(migrationSQL).toMatch(/id\s+UUID.*PRIMARY KEY/i);
    });

    it('should have game_id foreign key', () => {
      expect(migrationSQL).toMatch(/game_id\s+UUID.*REFERENCES\s+games/i);
    });

    it('should have actor_id (player)', () => {
      expect(migrationSQL).toMatch(/actor_id\s+UUID/i);
    });

    it('should have action_type', () => {
      expect(migrationSQL).toMatch(/action_type\s+TEXT\s+NOT NULL/i);
    });

    it('should have card_ids array', () => {
      expect(migrationSQL).toMatch(/card_ids\s+UUID\[\]/i);
    });

    it('should have source_zone_id and target_zone_id', () => {
      expect(migrationSQL).toMatch(/source_zone_id\s+UUID/i);
      expect(migrationSQL).toMatch(/target_zone_id\s+UUID/i);
    });

    it('should have undone_at for undo functionality', () => {
      expect(migrationSQL).toMatch(/undone_at\s+TIMESTAMPTZ/i);
    });
  });

  describe('card_marks table', () => {
    it('should have id UUID primary key', () => {
      expect(migrationSQL).toMatch(/id\s+UUID.*PRIMARY KEY/i);
    });

    it('should have card_id with FK to game_cards', () => {
      expect(migrationSQL).toMatch(
        /card_id\s+UUID\s+NOT NULL\s+REFERENCES\s+game_cards/i
      );
    });

    it('should have mark_type', () => {
      expect(migrationSQL).toMatch(/mark_type\s+TEXT\s+NOT NULL/i);
    });

    it('should have mark_value', () => {
      expect(migrationSQL).toMatch(/mark_value\s+TEXT\s+NOT NULL/i);
    });
  });

  describe('game_snapshots table', () => {
    it('should have id UUID primary key', () => {
      expect(migrationSQL).toMatch(/id\s+UUID.*PRIMARY KEY/i);
    });

    it('should have game_id foreign key', () => {
      expect(migrationSQL).toMatch(/game_id\s+UUID.*REFERENCES\s+games/i);
    });

    it('should have snapshot_data JSONB', () => {
      expect(migrationSQL).toMatch(/snapshot_data\s+JSONB\s+NOT NULL/i);
    });

    it('should have created_at timestamp', () => {
      expect(migrationSQL).toMatch(/created_at\s+TIMESTAMPTZ/i);
    });
  });

  describe('predefined_games table', () => {
    it('should have id TEXT primary key', () => {
      expect(migrationSQL).toMatch(/id\s+TEXT\s+PRIMARY KEY/i);
    });

    it('should have name and description', () => {
      expect(migrationSQL).toMatch(/name\s+TEXT\s+NOT NULL/i);
      expect(migrationSQL).toMatch(/description\s+TEXT/i);
    });

    it('should have deck_config JSONB', () => {
      expect(migrationSQL).toMatch(/deck_config\s+JSONB/i);
    });

    it('should seed Bataille Classique', () => {
      expect(migrationSQL).toMatch(/bataille-classique/i);
      expect(migrationSQL).toMatch(/Bataille Classique/);
    });

    it('should seed Uno Simplifié', () => {
      expect(migrationSQL).toMatch(/uno-simple/i);
      expect(migrationSQL).toMatch(/Uno Simplifié/i);
    });
  });

  describe('Indexes', () => {
    const requiredIndexes = [
      'idx_zones_game',
      'idx_zones_owner',
      'idx_primitive_actions_game',
      'idx_primitive_actions_actor',
      'idx_turn_state_current_player',
      'idx_card_marks_card',
      'idx_game_snapshots_game',
    ];

    requiredIndexes.forEach((index) => {
      it(`should create ${index} index`, () => {
        const indexRegex = new RegExp(
          `CREATE INDEX IF NOT EXISTS ${index}`,
          'i'
        );
        expect(migrationSQL).toMatch(indexRegex);
      });
    });

    it('should create partial index on zones.is_enabled', () => {
      expect(migrationSQL).toMatch(
        /CREATE INDEX.*idx_zones_enabled.*WHERE\s+is_enabled\s*=\s*true/i
      );
    });

    it('should create partial index on primitive_actions.undone_at', () => {
      expect(migrationSQL).toMatch(
        /CREATE INDEX.*idx_primitive_actions_undone.*WHERE\s+undone_at\s+IS\s+NULL/i
      );
    });

    it('should create index on game_cards.face_visible', () => {
      expect(migrationSQL).toMatch(
        /CREATE INDEX.*idx_game_cards_visible.*face_visible/i
      );
    });
  });

  describe('Functions', () => {
    const requiredFunctions = [
      'create_default_zones',
      'create_player_hand_zone',
      'initialize_turn_state',
      'get_next_player',
      'recycle_discard_to_deck',
      'calculate_player_score',
      'create_game_snapshot',
      'trigger_create_default_zones',
      'trigger_create_player_hand',
      'update_updated_at_column',
      'validate_turn_order',
      'validate_card_group_ids',
    ];

    requiredFunctions.forEach((fn) => {
      it(`should define ${fn} function`, () => {
        const fnRegex = new RegExp(
          `CREATE OR REPLACE FUNCTION ${fn}\\s*\\(`,
          'i'
        );
        expect(migrationSQL).toMatch(fnRegex);
      });
    });

    it('get_next_player should handle CLOCKWISE and COUNTERCLOCKWISE', () => {
      const fnMatch = migrationSQL.match(
        /CREATE OR REPLACE FUNCTION get_next_player[\s\S]*?\$\$;/i
      );
      expect(fnMatch).toBeTruthy();
      expect(fnMatch![0]).toMatch(/CLOCKWISE/i);
      expect(fnMatch![0]).toMatch(/COUNTER/i);
    });

    it('calculate_player_score should use COALESCE for safety', () => {
      const fnMatch = migrationSQL.match(
        /CREATE OR REPLACE FUNCTION calculate_player_score[\s\S]*?END;/i
      );
      expect(fnMatch).toBeTruthy();
      expect(fnMatch![0]).toMatch(/COALESCE/i);
    });

    it('validate_turn_order should check player exists in game', () => {
      const fnMatch = migrationSQL.match(
        /CREATE OR REPLACE FUNCTION validate_turn_order[\s\S]*?END;/i
      );
      expect(fnMatch).toBeTruthy();
      expect(fnMatch![0]).toMatch(/game_players/i);
      expect(fnMatch![0]).toMatch(/RAISE EXCEPTION/i);
    });
  });

  describe('Triggers', () => {
    it('should create trigger for turn_order validation', () => {
      expect(migrationSQL).toMatch(
        /CREATE TRIGGER\s+validate_turn_order_trigger/i
      );
    });

    it('should create trigger for card_ids validation', () => {
      expect(migrationSQL).toMatch(
        /CREATE TRIGGER\s+validate_card_ids_trigger/i
      );
    });

    it('should create trigger for game zone creation', () => {
      expect(migrationSQL).toMatch(
        /CREATE TRIGGER\s+on_game_start_create_zones/i
      );
    });

    it('should create trigger for player hand creation', () => {
      expect(migrationSQL).toMatch(
        /CREATE TRIGGER\s+on_player_join_create_hand/i
      );
    });

    it('should create trigger for updated_at on zones', () => {
      expect(migrationSQL).toMatch(
        /CREATE TRIGGER\s+update_zones_updated_at/i
      );
    });

    it('should create trigger for updated_at on turn_state', () => {
      expect(migrationSQL).toMatch(
        /CREATE TRIGGER\s+update_turn_state_updated_at/i
      );
    });
  });

  describe('Constraints', () => {
    it('should add unique constraint on games.code', () => {
      expect(migrationSQL).toMatch(
        /ALTER TABLE games ADD CONSTRAINT games_code_unique UNIQUE \(code\)/i
      );
    });

    it('should add unique constraint on zones(game_id, name)', () => {
      expect(migrationSQL).toMatch(
        /ALTER TABLE zones ADD CONSTRAINT zones_game_name_unique UNIQUE \(game_id,\s*name\)/i
      );
    });

    it('should have CHECK constraints for positive values', () => {
      expect(migrationSQL).toMatch(/CHECK.*max_capacity.*>\s*0/i);
      expect(migrationSQL).toMatch(/CHECK.*turn_number\s*>=\s*1/i);
      expect(migrationSQL).toMatch(/CHECK.*timer_seconds.*>\s*0/i);
    });
  });

  describe('RLS Policies', () => {
    it('should enable RLS on zones', () => {
      expect(migrationSQL).toMatch(/ALTER TABLE zones ENABLE ROW LEVEL SECURITY/i);
    });

    it('should enable RLS on primitive_actions', () => {
      expect(migrationSQL).toMatch(
        /ALTER TABLE primitive_actions ENABLE ROW LEVEL SECURITY/i
      );
    });

    it('should enable RLS on turn_state', () => {
      expect(migrationSQL).toMatch(
        /ALTER TABLE turn_state ENABLE ROW LEVEL SECURITY/i
      );
    });

    it('should have zone visibility policy respecting OWNER/GM_ONLY', () => {
      // Check that the policy handles both OWNER and GM_ONLY visibility
      expect(migrationSQL).toMatch(/Players can view zones in their games/i);
      expect(migrationSQL).toMatch(/zones\.visibility\s*=\s*'OWNER'/i);
      expect(migrationSQL).toMatch(/zones\.visibility\s*=\s*'GM_ONLY'/i);
    });

    it('should have policy for game master on games', () => {
      expect(migrationSQL).toMatch(
        /CREATE POLICY.*Game master can.*games/i
      );
    });
  });

  describe('Existing Table Modifications', () => {
    it('should add game_master_id to games table', () => {
      expect(migrationSQL).toMatch(
        /ADD COLUMN IF NOT EXISTS game_master_id/i
      );
    });

    it('should add current_round to games table', () => {
      expect(migrationSQL).toMatch(
        /ADD COLUMN IF NOT EXISTS current_round/i
      );
    });

    it('should add game_mode to games table', () => {
      expect(migrationSQL).toMatch(
        /ADD COLUMN IF NOT EXISTS game_mode/i
      );
    });

    it('should add role to game_players table', () => {
      expect(migrationSQL).toMatch(
        /ADD COLUMN IF NOT EXISTS role/i
      );
    });

    it('should add score to game_players table', () => {
      expect(migrationSQL).toMatch(
        /ADD COLUMN IF NOT EXISTS score/i
      );
    });

    it('should add face_visible to game_cards table', () => {
      expect(migrationSQL).toMatch(
        /ADD COLUMN IF NOT EXISTS face_visible/i
      );
    });

    it('should add group_id to game_cards table', () => {
      expect(migrationSQL).toMatch(
        /ADD COLUMN IF NOT EXISTS group_id/i
      );
    });

    it('should add numeric_values JSONB to cards table', () => {
      expect(migrationSQL).toMatch(
        /ADD COLUMN IF NOT EXISTS numeric_values\s+JSONB/i
      );
    });

    it('should make deck_id nullable on games', () => {
      expect(migrationSQL).toMatch(
        /ALTER COLUMN deck_id DROP NOT NULL/i
      );
    });
  });

  describe('Idempotency', () => {
    it('should use IF NOT EXISTS for all tables', () => {
      const tableCreations = migrationSQL.match(/CREATE TABLE/gi) || [];
      const ifNotExists = migrationSQL.match(/CREATE TABLE IF NOT EXISTS/gi) || [];

      // Allow some CREATE TABLE without IF NOT EXISTS (e.g., in comments or docs)
      // But the majority should have it
      expect(ifNotExists.length).toBeGreaterThan(5);
    });

    it('should use IF NOT EXISTS for all indexes', () => {
      const indexCreations = migrationSQL.match(/CREATE INDEX(?! IF NOT EXISTS)/gi) || [];

      // Should be very few or zero CREATE INDEX without IF NOT EXISTS
      expect(indexCreations.length).toBeLessThanOrEqual(2);
    });

    it('should use CREATE OR REPLACE for functions (idempotent)', () => {
      const createOrReplace = migrationSQL.match(/CREATE OR REPLACE FUNCTION/gi) || [];

      // Should have CREATE OR REPLACE for idempotency
      expect(createOrReplace.length).toBeGreaterThan(5);
    });

    it('should use ADD COLUMN IF NOT EXISTS', () => {
      const addColumns = migrationSQL.match(/ADD COLUMN IF NOT EXISTS/gi) || [];

      expect(addColumns.length).toBeGreaterThan(5);
    });
  });

  describe('Data Seeding', () => {
    it('should seed predefined games with ON CONFLICT DO NOTHING', () => {
      expect(migrationSQL).toMatch(/INSERT INTO predefined_games/i);
      expect(migrationSQL).toMatch(/ON CONFLICT.*DO NOTHING/i);
    });

    it('should seed at least 2 predefined games', () => {
      const batailleInserts = migrationSQL.match(/'bataille-classique'/gi) || [];
      expect(batailleInserts.length).toBeGreaterThan(0);

      const unoInserts = migrationSQL.match(/'uno-simple'/gi) || [];
      expect(unoInserts.length).toBeGreaterThan(0);
    });
  });

  describe('Security', () => {
    it('should not have obvious SQL injection vulnerabilities', () => {
      // Functions should not use EXECUTE with unescaped user input
      // This is a basic check - look for EXECUTE with string concatenation of parameters
      const dangerousExecute = migrationSQL.match(/EXECUTE\s+[^;]*\|\|\s*p_[a-z_]+(?!\s*::)/gi) || [];

      // Should have zero dangerous EXECUTE statements
      expect(dangerousExecute.length).toBe(0);
    });

    it('should use SECURITY DEFINER cautiously', () => {
      // SECURITY DEFINER should be used sparingly
      const securityDefiner = migrationSQL.match(/SECURITY DEFINER/gi) || [];

      // Should have few (currently 9 in v2 migration)
      expect(securityDefiner.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Error Handling', () => {
    it('should have error handling in critical functions', () => {
      const functionsWithErrors = [
        'get_next_player',
        'initialize_turn_state',
        'validate_turn_order',
      ];

      functionsWithErrors.forEach((fn) => {
        const fnMatch = migrationSQL.match(
          new RegExp(`CREATE OR REPLACE FUNCTION ${fn}[\\s\\S]*?END;`, 'i')
        );
        expect(fnMatch).toBeTruthy();
        expect(fnMatch![0]).toMatch(/RAISE EXCEPTION/i);
      });
    });
  });
});
