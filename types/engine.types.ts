export type GameMode =
    | 'COMPETITIVE'
    | 'COOPERATIVE'
    | 'TEAM_BASED'
    | 'TURN_BASED'
    | 'SIMULTANEOUS'
    | 'REAL_TIME'
    | 'TIMED';

export type CardPropertyType = 'number' | 'string' | 'boolean' | 'url' | 'array';

export interface CardProperties {
    value?: number;
    points?: number;
    cost?: number;
    category?: string;
    color?: string;
    suit?: string;
    is_special?: boolean;
    is_unique?: boolean;
    is_wild?: boolean;
    image_url: string;
    back_image_url?: string;
    description?: string;
    question?: string;
    keywords?: string[];
    [key: string]: any;
}

export interface CardType {
    id: string;
    name: string;
    properties: CardProperties;
}

export type ZoneType = 'DECK' | 'HAND' | 'PLAY_AREA' | 'DISCARD' | 'SHARED' | 'PRIVATE';
export type VisibilityType = 'PUBLIC' | 'PRIVATE' | 'OWNER_ONLY';
export type PermissionType = 'ALL' | 'OWNER' | 'TURN_PLAYER' | 'NONE';

export interface ZoneConfig {
    id: string;
    name: string;
    type: ZoneType;
    visibility: VisibilityType;
    max_cards?: number;
    min_cards?: number;
    can_view: PermissionType;
    can_draw: PermissionType;
    can_play_to: PermissionType;
    is_ordered: boolean;
    shuffle_on_init: boolean;
    scope: 'PLAYER' | 'GLOBAL';
}

export type MechanicType =
    | 'DRAW'
    | 'PLAY'
    | 'DISCARD'
    | 'DRAFT'
    | 'VOTE'
    | 'BID'
    | 'TRICK_TAKING'
    | 'MATCHING'
    | 'SET_COLLECTION'
    | 'COMBINATION'
    | 'EXCHANGE'
    | 'REVEAL'
    | 'STORYTELLING'
    | 'SELECTION'
    | 'DISCUSSION';

export type ActionType =
    | 'DRAW_CARDS'
    | 'PLAY_CARD'
    | 'DISCARD_CARD'
    | 'PASS_TURN'
    | 'VOTE'
    | 'REVEAL_ALL'
    | 'SHUFFLE_ZONE'
    | 'MOVE_CARD'
    | 'SELECT_PLAYER'
    | 'TIMER_START'
    | 'DISCUSS';

export interface GameRule {
    id: string;
    name: string;
    mechanic_type: MechanicType;
    trigger: {
        event: 'GAME_START' | 'TURN_START' | 'TURN_END' | 'CARD_PLAYED' | 'ALL_VOTED' | 'CUSTOM';
        condition?: string;
    };
    effect: {
        action: ActionType;
        parameters?: Record<string, any>;
    };
}

export type VictoryConditionType = 'POINTS' | 'EMPTY_HAND' | 'CONSENSUS' | 'OBJECTIVE' | 'NONE';

export interface VictoryCondition {
    condition_type: VictoryConditionType;
    target_points?: number;
    points_calculation?: 'SUM' | 'HIGHEST_CARD' | 'SETS' | 'CUSTOM';
    consensus_threshold?: number;
    objective_description?: string;
    check_timing: 'TURN_END' | 'GAME_END' | 'IMMEDIATE';
}

export interface PhaseConfig {
    id: string;
    name: string;
    duration_seconds?: number;
    allowed_actions: ActionType[];
    required_action?: ActionType;
    auto_pass: boolean;
}

export interface TurnStructure {
    turn_order: 'CLOCKWISE' | 'COUNTER_CLOCKWISE' | 'RANDOM' | 'HIGHEST_BID';
    phases: PhaseConfig[];
    skip_conditions?: string[];
}

export interface GameSettings {
    initial_distribution: {
        cards_per_player: number;
        distribution_mode: 'ALL_SAME' | 'RANDOM' | 'CUSTOM';
    };
    turn_time_limit?: number;
    game_time_limit?: number;
    show_card_count: boolean;
    show_discard_pile: boolean;
    allow_chat: boolean;
    allow_reactions: boolean;
    hints_enabled: boolean;
    rules_reference_accessible: boolean;
}

export interface DeckConfig {
    game_mode: GameMode;
    min_players: number;
    max_players: number;
    card_types: CardType[];
    zones: ZoneConfig[];
    rules: GameRule[];
    victory_conditions: VictoryCondition[];
    turn_structure: TurnStructure;
    settings: GameSettings;
}
