import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine, GameState } from '@/lib/game/engine'
import { createTestGameState } from '@/__tests__/fixtures/game-states'

describe('GameEngine', () => {
  let engine: GameEngine
  let gameState: GameState

  beforeEach(() => {
    gameState = createTestGameState()
    engine = new GameEngine(gameState.deck_config)
  })

  describe('validateAction', () => {
    describe('DRAW_CARDS action', () => {
      it('should allow DRAW_CARDS during player turn in allowed phase', () => {
        const validation = engine.validateAction(gameState, {
          type: 'DRAW_CARDS',
          playerId: 'user1',
        })

        expect(validation.valid).toBe(true)
        expect(validation.error).toBeUndefined()
      })

      it('should block DRAW_CARDS when not player turn', () => {
        const validation = engine.validateAction(gameState, {
          type: 'DRAW_CARDS',
          playerId: 'user2', // Not their turn
        })

        expect(validation.valid).toBe(false)
        expect(validation.error).toBeDefined()
        expect(validation.error).toContain('tour')
      })

      it('should block DRAW_CARDS when no cards left in deck', () => {
        const emptyDeckState = createTestGameState({
          cards: gameState.cards.filter(c => c.location !== 'deck-zone'),
        })

        const validation = engine.validateAction(emptyDeckState, {
          type: 'DRAW_CARDS',
          playerId: 'user1',
        })

        expect(validation.valid).toBe(false)
        expect(validation.error).toBeDefined()
        expect(validation.error).toContain('vide')
      })

      it('should block DRAW_CARDS when game is not playing', () => {
        const waitingState = createTestGameState({ status: 'waiting' })

        const validation = engine.validateAction(waitingState, {
          type: 'DRAW_CARDS',
          playerId: 'user1',
        })

        expect(validation.valid).toBe(false)
        expect(validation.error).toContain('pas en cours')
      })

      it('should block DRAW_CARDS when action not allowed in current phase', () => {
        const stateWithRestrictedPhase = createTestGameState({
          deck_config: {
            ...gameState.deck_config,
            turn_structure: {
              ...gameState.deck_config.turn_structure,
              phases: [
                {
                  id: 'main',
                  name: 'Main Phase',
                  allowed_actions: ['PLAY_CARD'], // DRAW_CARDS not allowed
                  auto_pass: false,
                },
              ],
            },
          },
        })

        const validationEngine = new GameEngine(stateWithRestrictedPhase.deck_config)
        const validation = validationEngine.validateAction(stateWithRestrictedPhase, {
          type: 'DRAW_CARDS',
          playerId: 'user1',
        })

        expect(validation.valid).toBe(false)
        expect(validation.error).toContain('pas autorisée')
      })
    })

    describe('PLAY_CARD action', () => {
      it('should allow PLAY_CARD when card in hand', () => {
        const validation = engine.validateAction(gameState, {
          type: 'PLAY_CARD',
          playerId: 'user1',
          payload: { cardId: 'card4' }, // Card in user1's hand
        })

        expect(validation.valid).toBe(true)
      })

      it('should block PLAY_CARD when card not in hand', () => {
        const validation = engine.validateAction(gameState, {
          type: 'PLAY_CARD',
          playerId: 'user1',
          payload: { cardId: 'card5' }, // Card in user2's hand
        })

        expect(validation.valid).toBe(false)
        expect(validation.error).toBeDefined()
        expect(validation.error).toContain('main')
      })

      it('should require cardId for PLAY_CARD action', () => {
        const validation = engine.validateAction(gameState, {
          type: 'PLAY_CARD',
          playerId: 'user1',
          payload: {}, // cardId missing
        })

        expect(validation.valid).toBe(false)
        expect(validation.error).toContain('carte')
      })

      it('should block PLAY_CARD when card does not exist', () => {
        const validation = engine.validateAction(gameState, {
          type: 'PLAY_CARD',
          playerId: 'user1',
          payload: { cardId: 'nonexistent' },
        })

        expect(validation.valid).toBe(false)
        expect(validation.error).toContain('introuvable')
      })
    })

    describe('PASS_TURN action', () => {
      it('should allow PASS_TURN during player turn', () => {
        const validation = engine.validateAction(gameState, {
          type: 'PASS_TURN',
          playerId: 'user1',
        })

        expect(validation.valid).toBe(true)
      })

      it('should block PASS_TURN when not player turn in TURN_BASED mode', () => {
        const validation = engine.validateAction(gameState, {
          type: 'PASS_TURN',
          playerId: 'user2',
        })

        expect(validation.valid).toBe(false)
        expect(validation.error).toContain('tour')
      })

      it('should allow PASS_TURN in COOPERATIVE mode regardless of turn', () => {
        const cooperativeState = createTestGameState({
          deck_config: {
            ...gameState.deck_config,
            game_mode: 'COOPERATIVE',
          },
        })

        const cooperativeEngine = new GameEngine(cooperativeState.deck_config)
        const validation = cooperativeEngine.validateAction(cooperativeState, {
          type: 'PASS_TURN',
          playerId: 'user2', // Not their turn
        })

        expect(validation.valid).toBe(true)
      })
    })

    describe('Invalid phase', () => {
      it('should block actions when current phase is invalid', () => {
        const invalidPhaseState = createTestGameState({
          current_phase_id: 'nonexistent-phase',
        })

        const validation = engine.validateAction(invalidPhaseState, {
          type: 'DRAW_CARDS',
          playerId: 'user1',
        })

        expect(validation.valid).toBe(false)
        expect(validation.error).toContain('invalide')
      })
    })
  })

  describe('checkVictory', () => {
    it('should return null when no victory conditions met', () => {
      const result = engine.checkVictory(gameState)

      expect(result.winnerId).toBeNull()
    })

    it('should detect winner when player has empty hand (EMPTY_HAND condition)', () => {
      const stateWithEmptyHand = createTestGameState({
        cards: gameState.cards.filter(c => !(c.location === 'hand-zone' && c.owner_id === 'user1')),
        deck_config: {
          ...gameState.deck_config,
          victory_conditions: [
            {
              condition_type: 'EMPTY_HAND',
              check_timing: 'IMMEDIATE',
            },
          ],
        },
      })

      const victoryEngine = new GameEngine(stateWithEmptyHand.deck_config)
      const result = victoryEngine.checkVictory(stateWithEmptyHand)

      expect(result.winnerId).toBeDefined()
      expect(result.reason).toContain('Main vide')
    })

    it('should detect winner when player reaches target points (POINTS condition)', () => {
      const stateWithPoints = createTestGameState({
        players: [
          {
            id: 'player1',
            user_id: 'user1',
            guest_session_id: null,
            name: 'Player 1',
            player_order: 0,
            is_active: true,
            score: 100, // Reached target
          },
          {
            id: 'player2',
            user_id: 'user2',
            guest_session_id: null,
            name: 'Player 2',
            player_order: 1,
            is_active: true,
            score: 50,
          },
        ],
        deck_config: {
          ...gameState.deck_config,
          victory_conditions: [
            {
              condition_type: 'POINTS',
              target_points: 100,
              check_timing: 'TURN_END',
            },
          ],
        },
      })

      const victoryEngine = new GameEngine(stateWithPoints.deck_config)
      const result = victoryEngine.checkVictory(stateWithPoints)

      expect(result.winnerId).toBe('player1')
      expect(result.reason).toContain('Score')
    })
  })
})
