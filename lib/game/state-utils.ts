import { createClient } from '@/lib/supabase/server';
import { GameState, GamePlayerState, GameCardState } from './engine';
import { DeckConfig, GameMode } from '@/types/engine.types';

export async function fetchGameState(gameId: string): Promise<GameState> {
    const supabase = await createClient();

    // 1. Fetch game and deck info (v2: zones are now per-game, not per-deck)
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select(`
      *,
      decks (
        *,
        card_types (*),
        game_rules (*)
      )
    `)
        .eq('id', gameId)
        .single();

    if (gameError || !game) {
        throw new Error('Partie introuvable');
    }

    // v2: deck_id can be null (games without predefined deck)
    const deck = game.decks as any;

    // 2. v2: Fetch zones (now per-game, not per-deck)
    const { data: zones, error: zonesError } = await supabase
        .from('zones')
        .select('*')
        .eq('game_id', gameId);

    if (zonesError) throw zonesError;

    // 3. Map DeckConfig
    const deckConfig: DeckConfig = {
        game_mode: (game.game_mode || 'UNIVERSAL') as GameMode, // v2: game_mode is on games table, not decks
        min_players: deck?.min_players || 2,
        max_players: game.max_players || 6,
        settings: deck?.settings || {},
        turn_structure: deck?.turn_structure || { type: 'FREE', phases: [] },
        card_types: deck?.card_types || [],
        zones: zones || [], // v2: zones are per-game
        rules: deck?.game_rules?.map((r: any) => ({
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
        })) || [],
        victory_conditions: (game.victory_conditions as any) || []
    };

    // 4. Fetch players
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
        score: p.score // v2: score field now exists
    }));

    // 5. Fetch cards
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
        zone_id: c.zone_id, // v2: renamed from location
        owner_id: c.owner_id, // v2: unified column (references game_players.id)
        position: c.position,
        image_url: (c.card as any)?.image_url || ''
    }));

    // 6. v2: Fetch turn_state for current player
    const { data: turnState } = await supabase
        .from('turn_state')
        .select('current_player_id')
        .eq('game_id', gameId)
        .single();

    return {
        game_id: gameId,
        deck_config: deckConfig,
        players: playerStates,
        cards: cardStates,
        current_player_id: turnState?.current_player_id || null, // v2: from turn_state
        current_phase_id: null, // v2: phase management removed, needs reimplementation
        status: game.status as any
    };
}
