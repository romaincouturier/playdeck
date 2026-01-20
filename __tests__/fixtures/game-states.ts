import { GameState } from '@/lib/game/engine'
import { DeckConfig } from '@/types/engine.types'

/**
 * Create a minimal valid game state for testing
 */
export function createTestGameState(overrides?: Partial<GameState>): GameState {
  const defaultDeckConfig: DeckConfig = {
    game_mode: 'TURN_BASED',
    min_players: 2,
    max_players: 4,
    card_types: [
      {
        id: 'type1',
        name: 'Basic Card',
        properties: {
          image_url: 'https://example.com/card.png',
          value: 1,
        },
      },
    ],
    zones: [
      {
        id: 'deck-zone',
        name: 'Deck',
        type: 'DECK',
        visibility: 'PRIVATE',
        can_draw: 'ALL',
        can_play_to: 'NONE',
        can_view: 'NONE',
        is_ordered: true,
        shuffle_on_init: true,
        scope: 'GLOBAL',
      },
      {
        id: 'hand-zone',
        name: 'Hand',
        type: 'HAND',
        visibility: 'OWNER_ONLY',
        can_draw: 'OWNER',
        can_play_to: 'OWNER',
        can_view: 'OWNER',
        is_ordered: false,
        shuffle_on_init: false,
        scope: 'PLAYER',
      },
      {
        id: 'discard-zone',
        name: 'Discard',
        type: 'DISCARD',
        visibility: 'PUBLIC',
        can_draw: 'NONE',
        can_play_to: 'ALL',
        can_view: 'ALL',
        is_ordered: false,
        shuffle_on_init: false,
        scope: 'GLOBAL',
      },
    ],
    rules: [],
    victory_conditions: [],
    turn_structure: {
      turn_order: 'CLOCKWISE',
      phases: [
        {
          id: 'main',
          name: 'Main Phase',
          allowed_actions: ['DRAW_CARDS', 'PLAY_CARD', 'PASS_TURN'],
          auto_pass: false,
        },
      ],
    },
    settings: {
      initial_distribution: {
        cards_per_player: 5,
        distribution_mode: 'ALL_SAME',
      },
      show_card_count: true,
      show_discard_pile: true,
      allow_chat: true,
      allow_reactions: false,
      hints_enabled: false,
      rules_reference_accessible: true,
    },
  }

  const defaultState: GameState = {
    game_id: 'test-game-123',
    status: 'playing',
    current_turn_player_id: 'user1',
    current_phase_id: 'main',
    players: [
      {
        id: 'player1',
        user_id: 'user1',
        guest_session_id: null,
        name: 'Player 1',
        player_order: 0,
        is_active: true,
        score: 0,
      },
      {
        id: 'player2',
        user_id: 'user2',
        guest_session_id: null,
        name: 'Player 2',
        player_order: 1,
        is_active: true,
        score: 0,
      },
    ],
    cards: [
      // Deck cards
      { id: 'card1', card_type_id: 'type1', location: 'deck-zone', owner_id: null, position: 0 },
      { id: 'card2', card_type_id: 'type1', location: 'deck-zone', owner_id: null, position: 1 },
      { id: 'card3', card_type_id: 'type1', location: 'deck-zone', owner_id: null, position: 2 },
      // Player hands
      { id: 'card4', card_type_id: 'type1', location: 'hand-zone', owner_id: 'user1', position: 0 },
      { id: 'card5', card_type_id: 'type1', location: 'hand-zone', owner_id: 'user2', position: 0 },
    ],
    deck_config: defaultDeckConfig,
  }

  return {
    ...defaultState,
    ...overrides,
    // Deep merge deck_config if provided
    deck_config: overrides?.deck_config
      ? { ...defaultDeckConfig, ...overrides.deck_config }
      : defaultDeckConfig,
  }
}

/**
 * Create a game state with a guest player
 */
export function createGuestGameState(): GameState {
  return createTestGameState({
    players: [
      {
        id: 'player1',
        user_id: 'user1',
        guest_session_id: null,
        name: 'Host Player',
        player_order: 0,
        is_active: true,
        score: 0,
      },
      {
        id: 'player2',
        user_id: null,
        guest_session_id: 'guest-123',
        name: 'Guest Player',
        player_order: 1,
        is_active: true,
        score: 0,
      },
    ],
  })
}

/**
 * Create a game state with disconnected players
 */
export function createDisconnectedPlayerState(): GameState {
  return createTestGameState({
    players: [
      {
        id: 'player1',
        user_id: 'user1',
        guest_session_id: null,
        name: 'Active Player',
        player_order: 0,
        is_active: true,
        score: 0,
      },
      {
        id: 'player2',
        user_id: 'user2',
        guest_session_id: null,
        name: 'Disconnected Player',
        player_order: 1,
        is_active: false,
        score: 0,
      },
    ],
  })
}
