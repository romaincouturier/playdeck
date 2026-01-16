import { ActionType, DeckConfig, GameRule, VictoryCondition, ZoneConfig } from '@/types/engine.types';

export interface GamePlayerState {
    id: string;
    user_id: string | null;
    guest_session_id: string | null;
    name: string;
    player_order: number;
    is_active: boolean;
    score: number;
}

export interface GameCardState {
    id: string;
    card_type_id: string;
    location: string; // zone_id
    owner_id: string | null; // user_id or guest_session_id
    position: number;
}

export interface GameState {
    game_id: string;
    deck_config: DeckConfig;
    players: GamePlayerState[];
    cards: GameCardState[];
    current_turn_player_id: string | null;
    current_phase_id: string;
    status: 'waiting' | 'playing' | 'finished';
}

export class GameEngine {
    constructor(private config: DeckConfig) { }

    /**
     * Validates if an action is allowed in the current state for a given player.
     */
    validateAction(state: GameState, action: { type: ActionType; playerId: string; payload?: any }): { valid: boolean; error?: string } {
        const { type, playerId, payload } = action;

        // 1. Basic checks
        if (state.status !== 'playing') {
            return { valid: false, error: 'La partie n\'est pas en cours.' };
        }

        // 2. Turn checks
        const isMyTurn = state.current_turn_player_id === playerId;
        const currentPhase = this.config.turn_structure.phases.find(p => p.id === state.current_phase_id);

        if (!currentPhase) {
            return { valid: false, error: 'Phase de jeu invalide.' };
        }

        // Check if action is allowed in this phase
        if (!currentPhase.allowed_actions.includes(type)) {
            return { valid: false, error: `L'action ${type} n'est pas autorisée dans cette phase.` };
        }

        // For turn-based modes, check if it's the player's turn
        if (this.config.game_mode === 'TURN_BASED' && !isMyTurn) {
            return { valid: false, error: 'Ce n\'est pas votre tour.' };
        }

        // 3. Action-specific validation
        switch (type) {
            case 'DRAW_CARDS':
                return this.validateDrawAction(state, playerId);
            case 'PLAY_CARD':
                return this.validatePlayAction(state, playerId, payload?.cardId, payload?.targetZoneId);
            case 'PASS_TURN':
                return { valid: isMyTurn || this.config.game_mode === 'COOPERATIVE', error: isMyTurn || this.config.game_mode === 'COOPERATIVE' ? undefined : 'Ce n\'est pas votre tour.' };
            case 'REVEAL_ALL':
                // Only host can reveal usually, but we check if action is allowed in phase
                return { valid: true }; // Server action will check if player is host
            default:
                // Generic mechanics check (placeholder for more complex rules)
                return { valid: true };
        }
    }

    private validateDrawAction(state: GameState, playerId: string): { valid: boolean; error?: string } {
        const deckZone = state.deck_config.zones.find(z => z.type === 'DECK');
        if (!deckZone) return { valid: false, error: 'Aucune pioche configurée.' };

        const cardsInDeck = state.cards.filter(c => c.location === deckZone.id);
        if (cardsInDeck.length === 0) return { valid: false, error: 'La pioche est vide.' };

        return { valid: true };
    }

    private validatePlayAction(state: GameState, playerId: string, cardId?: string, targetZoneId?: string): { valid: boolean; error?: string } {
        if (!cardId) return { valid: false, error: 'ID de carte manquant.' };

        const card = state.cards.find(c => c.id === cardId);
        if (!card) return { valid: false, error: 'Carte introuvable.' };

        // Check if card is in player's hand
        const handZone = state.deck_config.zones.find(z => z.type === 'HAND' && z.scope === 'PLAYER');
        if (!handZone || card.location !== handZone.id || card.owner_id !== playerId) {
            return { valid: false, error: 'La carte n\'est pas dans votre main.' };
        }

        // Check target zone permissions
        if (targetZoneId) {
            const targetZone = state.deck_config.zones.find(z => z.id === targetZoneId);
            if (!targetZone) return { valid: false, error: 'Zone cible invalide.' };

            if (targetZone.can_play_to === 'TURN_PLAYER' && state.current_turn_player_id !== playerId) {
                return { valid: false, error: 'Vous ne pouvez pas jouer dans cette zone.' };
            }
        }

        // For Planning Poker (COOPERATIVE), we allow changing the vote if it's the voting phase
        if (this.config.game_mode === 'COOPERATIVE' && state.current_phase_id === 'voting') {
            const existingCardInZone = state.cards.find(c => c.location === targetZoneId && c.owner_id === playerId);
            if (existingCardInZone) {
                // Technically valid to play another, but the server action should handle swapping
                return { valid: true };
            }
        }

        return { valid: true };
    }

    /**
     * Determines if a victory condition has been met.
     */
    checkVictory(state: GameState): { winnerId: string | null; reason?: string } {
        for (const condition of this.config.victory_conditions) {
            switch (condition.condition_type) {
                case 'EMPTY_HAND':
                    const playerWithEmptyHand = state.players.find(p => {
                        const handZone = state.deck_config.zones.find(z => z.type === 'HAND' && z.scope === 'PLAYER');
                        if (!handZone) return false;
                        return !state.cards.some(c => c.location === handZone.id && c.owner_id === (p.user_id || p.guest_session_id));
                    });
                    if (playerWithEmptyHand) return { winnerId: playerWithEmptyHand.id, reason: 'Main vide !' };
                    break;
                case 'POINTS':
                    const winnerByPoints = state.players.find(p => p.score >= (condition.target_points || 0));
                    if (winnerByPoints) return { winnerId: winnerByPoints.id, reason: 'Score atteint !' };
                    break;
            }
        }
        return { winnerId: null };
    }
}
