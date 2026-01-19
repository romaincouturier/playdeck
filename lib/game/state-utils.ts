import { createClient } from '@/lib/supabase/server';
import { GameState, GamePlayerState, GameCardState } from './engine';
import { DeckConfig } from '@/types/engine.types';

export async function fetchGameState(gameId: string): Promise<GameState> {
    const supabase = await createClient();

    // 1. Fetch game and deck info
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select(`
      *,
      decks (
        *,
        card_types (*),
        zones (*),
        game_rules (*)
      )
    `)
        .eq('id', gameId)
        .single();

    if (gameError || !game) {
        throw new Error('Partie introuvable');
    }

    const deck = game.decks as any;

    // 2. Map DeckConfig
    const deckConfig: DeckConfig = {
        game_mode: deck.game_mode,
        min_players: deck.min_players,
        max_players: game.max_players,
        settings: deck.settings,
        turn_structure: deck.turn_structure,
        card_types: deck.card_types,
        zones: deck.zones,
        rules: deck.game_rules.map((r: any) => ({
            id: r.id,
            name: r.name,
            mechanic_type: r.mechanic_type,
            trigger: {
                event: r.trigger_event,
                condition: r.trigger_condition
            },
            effect: {
                action: r.action_type,
                parameters: r.action_parameters
            }
        })),
        victory_conditions: (game.victory_conditions as any) || []
    };

    // 3. Fetch players
    const { data: players, error: playersError } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .order('player_order');

    if (playersError) throw playersError;

    const playerStates: GamePlayerState[] = players.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        guest_session_id: p.guest_session_id,
        name: p.guest_name || 'Joueur',
        player_order: p.player_order,
        is_active: !p.has_left,
        score: 0 // Placeholder for now
    }));

    // 4. Fetch cards
    const { data: gameCards, error: cardsError } = await supabase
        .from('game_cards')
        .select(`
            *,
            card:cards(image_url)
        `)
        .eq('game_id', gameId);

    if (cardsError) throw cardsError;

    const cardStates: any[] = (gameCards || []).map((c: any) => ({
        id: c.id,
        card_type_id: c.card_id,
        location: c.location,
        owner_id: c.owner_user_id || c.owner_guest_session_id,
        position: c.position,
        image_url: (c.card as any)?.image_url || ''
    }));

    return {
        game_id: gameId,
        deck_config: deckConfig,
        players: playerStates,
        cards: cardStates,
        current_turn_player_id: game.current_turn_player_id || game.current_turn_guest_id,
        current_phase_id: game.current_phase_id,
        status: game.status as any
    };
}
