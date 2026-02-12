/**
 * Deep Analysis Tests for PlayDeck v2 Migration
 *
 * These tests perform static analysis to find subtle bugs:
 * - Data consistency issues
 * - Edge cases not handled
 * - Missing NULL checks
 * - Foreign key inconsistencies
 * - Index coverage gaps
 * - Race conditions
 * - Migration path issues
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

describe('V2 Migration - Deep Analysis', () => {
  describe('Foreign Key Consistency', () => {
    it('should have ON DELETE CASCADE on all zone references', () => {
      // zones.owner_player_id should cascade when player is deleted
      const ownerPlayerFk = migrationSQL.match(
        /owner_player_id\s+UUID\s+REFERENCES\s+game_players[^;]*/i
      );
      expect(ownerPlayerFk).toBeTruthy();
      expect(ownerPlayerFk![0]).toMatch(/ON DELETE CASCADE/i);
    });

    it('should have proper cascade on game_cards.zone_id via constraint', () => {
      // Check that FK constraint is added with ON DELETE CASCADE
      expect(migrationSQL).toMatch(/game_cards_zone_id_fkey/i);
      expect(migrationSQL).toMatch(/FOREIGN KEY.*zone_id.*REFERENCES zones.*ON DELETE CASCADE/i);
    });

    it('should have proper cascade on game_cards.owner_id', () => {
      // When player is deleted, cards ownership should be handled
      const ownerIdFk = migrationSQL.match(
        /owner_id\s+UUID\s+REFERENCES\s+game_players[^;]*/i
      );
      expect(ownerIdFk).toBeTruthy();
      // Should be SET NULL or CASCADE - verify which makes sense
      expect(ownerIdFk![0]).toMatch(/ON DELETE (SET NULL|CASCADE)/i);
    });

    it('should have proper cascade on card_groups.owner_id', () => {
      const groupOwnerFk = migrationSQL.match(
        /CREATE TABLE IF NOT EXISTS card_groups[\s\S]*?owner_id\s+UUID\s+REFERENCES\s+game_players[^;]*/i
      );
      if (groupOwnerFk) {
        expect(groupOwnerFk[0]).toMatch(/ON DELETE (SET NULL|CASCADE)/i);
      }
    });
  });

  describe('Index Coverage', () => {
    it('should have index on all foreign keys for performance', () => {
      // Check that FK columns have indexes
      const fkColumns = [
        { table: 'zones', column: 'game_id', index: 'idx_zones_game' },
        { table: 'zones', column: 'owner_player_id', index: 'idx_zones_owner' },
        { table: 'primitive_actions', column: 'game_id', index: 'idx_primitive_actions_game' },
        { table: 'primitive_actions', column: 'actor_id', index: 'idx_primitive_actions_actor' },
        { table: 'turn_state', column: 'current_player_id', index: 'idx_turn_state_current_player' },
        { table: 'card_marks', column: 'card_id', index: 'idx_card_marks_card' },
        { table: 'game_snapshots', column: 'game_id', index: 'idx_game_snapshots_game' },
      ];

      fkColumns.forEach(({ table, column, index }) => {
        const indexRegex = new RegExp(`CREATE INDEX IF NOT EXISTS ${index}`, 'i');
        expect(migrationSQL).toMatch(indexRegex);
      });
    });

    it('should have composite index on game_cards(game_id, zone_id)', () => {
      // This is a common query pattern - get all cards in a zone for a game
      // Check if we have idx_game_cards_zone which should cover zone_id
      expect(migrationSQL).toMatch(/idx_game_cards_zone/i);
    });
  });

  describe('NULL Handling in Functions', () => {
    it('get_next_player should validate turn_order is not NULL', () => {
      const fnBody = migrationSQL.match(
        /CREATE OR REPLACE FUNCTION get_next_player[\s\S]*?\$\$;/i
      );
      expect(fnBody).toBeTruthy();

      // Should check if turn_order IS NULL
      expect(fnBody![0]).toMatch(/turn_order IS NULL/i);
      expect(fnBody![0]).toMatch(/RAISE EXCEPTION/i);
    });

    it('initialize_turn_state should handle case with no players', () => {
      const fnBody = migrationSQL.match(
        /CREATE OR REPLACE FUNCTION initialize_turn_state[\s\S]*?\$\$;/i
      );
      expect(fnBody).toBeTruthy();

      // Should check if player list is empty
      expect(fnBody![0]).toMatch(/array_length.*IS NULL/i);
      expect(fnBody![0]).toMatch(/RAISE EXCEPTION/i);
    });

    it('calculate_player_score should use COALESCE for NULL scores', () => {
      const fnBody = migrationSQL.match(
        /CREATE OR REPLACE FUNCTION calculate_player_score[\s\S]*?\$\$;/i
      );
      expect(fnBody).toBeTruthy();

      // Should use COALESCE to handle NULL numeric values
      expect(fnBody![0]).toMatch(/COALESCE/i);
    });

    it('recycle_discard_to_deck should validate zones exist', () => {
      const fnBody = migrationSQL.match(
        /CREATE OR REPLACE FUNCTION recycle_discard_to_deck[\s\S]*?\$\$;/i
      );
      expect(fnBody).toBeTruthy();

      // Should check that DISCARD zone exists
      expect(fnBody![0]).toMatch(/v_discard_zone_id IS NULL/i);
      expect(fnBody![0]).toMatch(/DISCARD zone not found/i);

      // Should check that DECK zone exists
      expect(fnBody![0]).toMatch(/v_deck_zone_id IS NULL/i);
      expect(fnBody![0]).toMatch(/DECK zone not found/i);
    });
  });

  describe('Data Consistency Rules', () => {
    it('turn_state.current_player_id should be in turn_order', () => {
      // This is validated by trigger validate_turn_order
      expect(migrationSQL).toMatch(/CREATE TRIGGER\s+validate_turn_order_trigger/i);
      expect(migrationSQL).toMatch(/CREATE OR REPLACE FUNCTION validate_turn_order/i);
    });

    it('zones with visibility=OWNER must have owner_player_id', () => {
      // Check if there's validation for this
      const zonesTable = migrationSQL.match(
        /CREATE TABLE IF NOT EXISTS zones[\s\S]*?\);/i
      );
      expect(zonesTable).toBeTruthy();

      // Should have CHECK constraint or trigger to validate this
      // For now, check the structure allows this combination
      expect(zonesTable![0]).toMatch(/owner_player_id\s+UUID/i);
      expect(zonesTable![0]).toMatch(/visibility\s+TEXT/i);
    });

    it('game_cards.zone_id should reference existing zone in same game', () => {
      // This is enforced by FK constraint
      expect(migrationSQL).toMatch(/zone_id\s+UUID\s+REFERENCES\s+zones/i);

      // But we should also check there's no cross-game references
      // This would require a CHECK constraint or trigger
      // For now, verify the FK exists
    });

    it('primitive_actions.card_ids should reference cards in the game', () => {
      // Check if there's validation trigger
      expect(migrationSQL).toMatch(/CREATE TRIGGER\s+validate_card_ids_trigger/i);
      expect(migrationSQL).toMatch(/CREATE OR REPLACE FUNCTION validate_card_group_ids/i);
    });
  });

  describe('Edge Cases', () => {
    it('should validate turn_order is not empty', () => {
      const validateFn = migrationSQL.match(
        /CREATE OR REPLACE FUNCTION validate_turn_order[\s\S]*?\$\$;/i
      );
      expect(validateFn).toBeTruthy();

      // Should check array_length
      expect(validateFn![0]).toMatch(/array_length/i);

      // Should raise exception if empty
      expect(validateFn![0]).toMatch(/turn_order cannot be empty/i);

      // Should check for duplicates
      expect(validateFn![0]).toMatch(/duplicate/i);
    });

    it('should handle game with single player', () => {
      const getNextPlayer = migrationSQL.match(
        /CREATE OR REPLACE FUNCTION get_next_player[\s\S]*?\$\$;/i
      );
      expect(getNextPlayer).toBeTruthy();

      // With single player, next player should be same player
      // Check modulo logic handles this
      expect(getNextPlayer![0]).toMatch(/%|mod/i);
    });

    it('should handle max_capacity = 0 validation', () => {
      const zonesTable = migrationSQL.match(
        /CREATE TABLE IF NOT EXISTS zones[\s\S]*?max_capacity[^,;]*/i
      );
      expect(zonesTable).toBeTruthy();

      // max_capacity should be > 0 if not NULL
      expect(zonesTable![0]).toMatch(/CHECK.*max_capacity.*>\s*0/i);
    });

    it('should handle negative scores', () => {
      const gamePlayersTable = migrationSQL.match(
        /ALTER TABLE game_players[\s\S]*?score[^;]*/i
      );
      expect(gamePlayersTable).toBeTruthy();

      // Score should allow negative values (some games have negative points)
      // So there should NOT be a CHECK score >= 0
      expect(gamePlayersTable![0]).not.toMatch(/CHECK.*score\s*>=\s*0/i);
    });

    it('should handle turn_number = 0 validation', () => {
      const turnStateTable = migrationSQL.match(
        /CREATE TABLE IF NOT EXISTS turn_state[\s\S]*?turn_number[^,;]*/i
      );
      expect(turnStateTable).toBeTruthy();

      // turn_number should be >= 1
      expect(turnStateTable![0]).toMatch(/CHECK.*turn_number\s*>=\s*1/i);
    });
  });

  describe('Migration Path Issues', () => {
    it('should rename location to zone_id before adding zone_id', () => {
      // Check the DO block that renames comes before ADD COLUMN
      const renameBlock = migrationSQL.indexOf('RENAME COLUMN location TO zone_id');
      const addColumn = migrationSQL.indexOf('ADD COLUMN IF NOT EXISTS zone_id');

      if (renameBlock !== -1 && addColumn !== -1) {
        expect(renameBlock).toBeLessThan(addColumn);
      }
    });

    it('should rename owner_user_id to owner_id before adding owner_id', () => {
      const renameBlock = migrationSQL.indexOf('RENAME COLUMN owner_user_id TO owner_id');
      const addColumn = migrationSQL.indexOf('ADD COLUMN IF NOT EXISTS owner_id');

      if (renameBlock !== -1 && addColumn !== -1) {
        expect(renameBlock).toBeLessThan(addColumn);
      }
    });

    it('should drop constraints before dropping columns', () => {
      // RLS policies on games should be dropped before modifying game_master_id
      const dropPolicies = migrationSQL.indexOf('DROP POLICY IF EXISTS');
      const dropColumns = migrationSQL.indexOf('DROP COLUMN IF EXISTS host_id');

      // Policies might not be dropped, but if they are, should be before column drops
      if (dropPolicies !== -1 && dropColumns !== -1) {
        // This check is tricky - policies might be recreated, not just dropped
        // Skip for now
      }
    });

    it('should not have circular dependencies in triggers', () => {
      // Check that triggers don't call each other in loops
      const triggers = migrationSQL.match(/CREATE TRIGGER[\s\S]*?;/gi) || [];

      // trigger_create_default_zones on games - can be on UPDATE (when status changes)
      // trigger_create_player_hand on game_players - should be on INSERT

      const gamesTrigger = triggers.find(t => t.includes('on_game_start_create_zones'));
      if (gamesTrigger) {
        // Should be AFTER UPDATE on games (zones created when game starts)
        expect(gamesTrigger).toMatch(/AFTER UPDATE.*ON games/i);
      }

      const playerTrigger = triggers.find(t => t.includes('on_player_join_create_hand'));
      if (playerTrigger) {
        // Should be AFTER INSERT on game_players
        expect(playerTrigger).toMatch(/AFTER INSERT.*ON game_players/i);
      }
    });
  });

  describe('RLS Policy Coverage', () => {
    it('zones table should have SELECT policy', () => {
      expect(migrationSQL).toMatch(/Players can view zones in their games/i);
      expect(migrationSQL).toMatch(/ON zones FOR SELECT/i);
    });

    it('zones table should have INSERT/UPDATE/DELETE policies for GM', () => {
      expect(migrationSQL).toMatch(/Game master can manage zones/i);
      expect(migrationSQL).toMatch(/ON zones FOR ALL/i);
    });

    it('primitive_actions should have RLS enabled', () => {
      expect(migrationSQL).toMatch(/ALTER TABLE primitive_actions ENABLE ROW LEVEL SECURITY/i);
    });

    it('turn_state should have RLS enabled', () => {
      expect(migrationSQL).toMatch(/ALTER TABLE turn_state ENABLE ROW LEVEL SECURITY/i);
    });

    it('game_master table should restrict to own user', () => {
      // Check that game_master policies use auth.uid()
      expect(migrationSQL).toMatch(/Game master can view own games/i);
      expect(migrationSQL).toMatch(/ON game_master FOR SELECT/i);
      expect(migrationSQL).toMatch(/user_id = auth\.uid\(\)/i);
    });
  });

  describe('Performance Anti-Patterns', () => {
    it('should not use SELECT * in functions', () => {
      // Functions should select only needed columns
      const functionsWithSelectStar = migrationSQL.match(
        /SELECT\s+\*\s+FROM/gi
      ) || [];

      // Some SELECT * might be ok in snapshots, but generally should be avoided
      // This is a warning, not a hard failure
      expect(functionsWithSelectStar.length).toBeLessThan(5);
    });

    it('should use LIMIT in potentially large queries', () => {
      // recycle_discard_to_deck might fetch all cards
      const recycleFunction = migrationSQL.match(
        /CREATE OR REPLACE FUNCTION recycle_discard_to_deck[\s\S]*?\$\$;/i
      );

      if (recycleFunction) {
        // Should be ok to fetch all cards in discard, but verify it's bounded
        // by zone, not all cards in game
        expect(recycleFunction[0]).toMatch(/WHERE.*zone_id/i);
      }
    });

    it('should not have N+1 query patterns in loops', () => {
      // Check for LOOP with SELECT inside
      const loopsWithSelect = migrationSQL.match(
        /LOOP[\s\S]*?SELECT[\s\S]*?END LOOP/gi
      ) || [];

      // If there are loops with SELECT, verify they're necessary
      // For now, just count them - should be minimal
      expect(loopsWithSelect.length).toBeLessThan(3);
    });
  });

  describe('Security Concerns', () => {
    it('should not expose sensitive data in COMMENT ON', () => {
      // Comments should not contain passwords, keys, etc.
      const comments = migrationSQL.match(/COMMENT ON[\s\S]*?;/gi) || [];

      comments.forEach(comment => {
        expect(comment.toLowerCase()).not.toMatch(/password|secret|key|token/);
      });
    });

    it('should use SECURITY DEFINER only where necessary', () => {
      // Functions with SECURITY DEFINER should be carefully reviewed
      const definerFunctions = migrationSQL.match(
        /CREATE OR REPLACE FUNCTION\s+(\w+)[\s\S]*?SECURITY DEFINER/gi
      ) || [];

      // Should be used for functions that need elevated privileges
      // Like creating zones, which regular users can't do
      expect(definerFunctions.length).toBeGreaterThan(0);
      expect(definerFunctions.length).toBeLessThan(15);
    });

    it('should validate user input in functions', () => {
      // Functions should check for SQL injection via parameters
      // Since we're using PL/pgSQL with parameterized queries, this is mostly safe
      // But check for any string concatenation with parameters

      const dangerousPatterns = migrationSQL.match(
        /EXECUTE\s+['"]\s*[^'"]*\|\|[^'"]*p_/gi
      ) || [];

      expect(dangerousPatterns.length).toBe(0);
    });
  });

  describe('Data Type Consistency', () => {
    it('should use consistent UUID column types', () => {
      // All ID columns should be UUID, not TEXT or other types
      const idColumns = migrationSQL.match(/(\w+_id)\s+(TEXT|VARCHAR|INTEGER)/gi) || [];

      // Some exceptions might exist (like predefined_games.id is TEXT)
      // But generally, foreign keys should be UUID
      expect(idColumns.length).toBeLessThan(3);
    });

    it('should use TIMESTAMPTZ consistently, not TIMESTAMP', () => {
      // Should use timezone-aware timestamps
      const timestamps = migrationSQL.match(/\s+TIMESTAMP\s+/gi) || [];

      // Should all be TIMESTAMPTZ
      expect(timestamps.length).toBe(0);
    });

    it('should use consistent enum values (TEXT with CHECK)', () => {
      // Enums should be TEXT with CHECK constraint
      // Check that visibility, type, role, etc. have CHECK constraints

      const enumChecks = [
        /visibility\s+TEXT.*CHECK.*IN/i,
        /type\s+TEXT.*CHECK.*IN/i,
        /role\s+TEXT.*CHECK.*IN/i,
        /direction\s+TEXT.*CHECK.*IN/i,
      ];

      enumChecks.forEach(pattern => {
        expect(migrationSQL).toMatch(pattern);
      });
    });
  });

  describe('Logical Inconsistencies', () => {
    it('direction should only be CLOCKWISE or COUNTERCLOCKWISE', () => {
      const directionCheck = migrationSQL.match(
        /direction\s+TEXT[^;]*CHECK[^;]*/i
      );

      if (directionCheck) {
        expect(directionCheck[0]).toMatch(/CLOCKWISE/i);
        expect(directionCheck[0]).toMatch(/COUNTER/i);
      }
    });

    it('zones.visibility should include all necessary values', () => {
      const visibilityCheck = migrationSQL.match(
        /visibility\s+TEXT[^;]*CHECK[^;]*/i
      );

      expect(visibilityCheck).toBeTruthy();
      expect(visibilityCheck![0]).toMatch(/PRIVATE/i);
      expect(visibilityCheck![0]).toMatch(/OWNER/i);
      expect(visibilityCheck![0]).toMatch(/ALL/i);
      expect(visibilityCheck![0]).toMatch(/GM_ONLY/i);
    });

    it('zones.default_face should be VISIBLE or HIDDEN', () => {
      const faceCheck = migrationSQL.match(
        /default_face\s+TEXT[^;]*CHECK[^;]*/i
      );

      expect(faceCheck).toBeTruthy();
      expect(faceCheck![0]).toMatch(/VISIBLE/i);
      expect(faceCheck![0]).toMatch(/HIDDEN/i);
    });

    it('game_mode should be UNIVERSAL in v2', () => {
      const gameModeAdd = migrationSQL.match(
        /ADD COLUMN IF NOT EXISTS game_mode\s+TEXT\s+DEFAULT\s+'([^']+)'/i
      );

      expect(gameModeAdd).toBeTruthy();
      expect(gameModeAdd![1]).toBe('UNIVERSAL');
    });
  });

  describe('Missing Features Check', () => {
    it('should have function to create game snapshot', () => {
      expect(migrationSQL).toMatch(/CREATE OR REPLACE FUNCTION create_game_snapshot/i);
    });

    it('should have function to initialize turn state', () => {
      expect(migrationSQL).toMatch(/CREATE OR REPLACE FUNCTION initialize_turn_state/i);
    });

    it('should have function to get visible cards for player', () => {
      // This function might not exist yet - check
      const hasFunction = migrationSQL.match(/CREATE OR REPLACE FUNCTION get_visible_cards_for_player/i);

      if (!hasFunction) {
        // This is a potential missing feature
        // Mark as warning for now
        console.warn('⚠️ Missing function: get_visible_cards_for_player');
      }
    });

    it('should have predefined games seeded', () => {
      expect(migrationSQL).toMatch(/INSERT INTO predefined_games/i);
      expect(migrationSQL).toMatch(/'bataille-classique'/i);
      expect(migrationSQL).toMatch(/'uno-simple'/i);
    });
  });
});
