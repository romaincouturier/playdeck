/**
 * Types pour les actions primitives du moteur universel v2
 * Ces primitives sont les briques atomiques que le MJ compose pour créer n'importe quel jeu
 */

// ============================================================================
// TYPES D'ACTIONS PRIMITIVES
// ============================================================================

export type PrimitiveActionType =
  // ==================== Distribution (DIS-*) ====================
  | 'REVEAL_TOP_CARD'      // DIS-01: Révéler la carte du dessus de la pioche
  | 'ASSIGN_TO_PLAYER'     // DIS-02: Attribuer carte révélée à un joueur
  | 'DISTRIBUTE_BATCH'     // DIS-05: Distribution rapide de N cartes
  | 'DISTRIBUTE_TO_ZONE'   // DIS-07: Distribuer vers une zone spécifique

  // ==================== Actions sur cartes (ACT-*) ====================
  | 'PLAY_TO_CENTER'       // ACT-01: Poser carte au centre
  | 'DISCARD'              // ACT-02: Défausser une carte
  | 'RETURN_TO_DECK'       // ACT-03: Remettre carte dans la pioche
  | 'GIVE_TO_PLAYER'       // ACT-04: Donner carte à un autre joueur
  | 'DRAW_TOP'             // ACT-05: Piocher carte du dessus
  | 'DRAW_BOTTOM'          // ACT-06: Piocher carte du dessous
  | 'DRAW_SPECIFIC'        // ACT-07: MJ pioche carte spécifique
  | 'TAKE_FROM_DISCARD'    // ACT-08: Prendre carte de la défausse
  | 'TAKE_FROM_CENTER'     // ACT-09: Prendre carte du centre
  | 'FLIP_CARD'            // ACT-10: Retourner une carte
  | 'REVEAL_TO_ALL'        // ACT-11: Révéler carte temporairement à tous
  | 'REVEAL_TO_PLAYER'     // ACT-12: Révéler carte à un joueur spécifique
  | 'GROUP_CARDS'          // ACT-13: Grouper plusieurs cartes ensemble
  | 'UNGROUP_CARDS'        // ACT-14: Dégrouper des cartes
  | 'EXCHANGE_CARDS'       // ACT-15: Échanger cartes entre joueurs
  | 'SKIP_TURN'            // ACT-16: Passer son tour

  // ==================== Fin de tour (FDT-*) ====================
  | 'CARDS_TO_DISCARD'     // FDT-01: Envoyer cartes centre → défausse
  | 'CARDS_TO_PLAYER'      // FDT-02: Attribuer cartes centre → joueur (pli)
  | 'CARDS_STAY_CENTER'    // FDT-03: Laisser cartes au centre
  | 'CARDS_TO_DECK'        // FDT-04: Remettre cartes dans pioche

  // ==================== Gestion tours (TOU-*) ====================
  | 'SET_FIRST_PLAYER'     // TOU-01: Désigner premier joueur manuellement
  | 'RANDOM_FIRST_PLAYER'  // TOU-02: Tirer au sort premier joueur
  | 'PASS_TURN'            // TOU-03: Passer la main (sens horaire)
  | 'PASS_TO_PLAYER'       // TOU-04: Donner main à joueur spécifique
  | 'REVERSE_DIRECTION'    // TOU-05: Inverser sens de rotation
  | 'SKIP_PLAYER'          // TOU-06: Sauter le tour d'un joueur
  | 'PAUSE_GAME'           // TOU-08: Mettre en pause

  // ==================== Scoring (SCO-*) ====================
  | 'ADD_POINTS'           // SCO-01: Ajouter points à un joueur
  | 'REMOVE_POINTS'        // SCO-01: Retirer points
  | 'DECLARE_ROUND_WINNER' // SCO-04: Vainqueur de manche
  | 'DECLARE_GAME_WINNER'  // SCO-05: Vainqueur de partie
  | 'CANCEL_DECLARATION'   // SCO-06: Annuler déclaration

  // ==================== Gestion partie (PAR-*) ====================
  | 'NEW_ROUND'            // PAR-01: Nouvelle donne/manche
  | 'RECALL_ALL_CARDS'     // PAR-03: Rappeler toutes cartes → pioche
  | 'END_GAME'             // PAR-04: Terminer la partie
  | 'UNDO_ACTION';         // PAR-06: Annuler dernière action

// ============================================================================
// INTERFACE ACTION PRIMITIVE
// ============================================================================

export interface PrimitiveAction {
  type: PrimitiveActionType;
  actorId: string; // ID du game_player qui exécute (MJ ou joueur)

  // ==================== Paramètres cartes ====================
  cardIds?: string[]; // IDs des cartes concernées
  sourceZoneId?: string; // Zone source
  targetZoneId?: string; // Zone destination
  targetPlayerId?: string; // Joueur cible

  // ==================== Paramètres visibilité ====================
  faceVisible?: boolean; // Face visible ou cachée

  // ==================== Paramètres distribution ====================
  count?: number; // Nombre de cartes (pour DISTRIBUTE_BATCH)
  distributeToAll?: boolean; // Distribuer à tous les joueurs

  // ==================== Paramètres scoring ====================
  points?: number; // Points à ajouter/retirer
  reason?: string; // Raison du scoring (affichage)

  // ==================== Paramètres groupage ====================
  groupId?: string; // ID du groupe (pour GROUP_CARDS/UNGROUP_CARDS)
  groupName?: string; // Nom du groupe

  // ==================== Paramètres tours ====================
  direction?: 'CLOCKWISE' | 'COUNTER_CLOCKWISE'; // Direction pour REVERSE_DIRECTION

  // ==================== Paramètres généraux ====================
  parameters?: Record<string, any>; // Paramètres additionnels extensibles
  timestamp: string; // Date/heure d'exécution
}

// ============================================================================
// RÉSULTAT D'EXÉCUTION
// ============================================================================

export interface PrimitiveActionResult {
  success: boolean;
  error?: string;
  actionId?: string; // ID de l'action enregistrée dans primitive_actions
  affectedCards?: string[]; // IDs des cartes affectées
  affectedPlayers?: string[]; // IDs des joueurs affectés
  newState?: Partial<any>; // Nouvelles valeurs d'état
}

// ============================================================================
// VALIDATION D'ACTION
// ============================================================================

export interface PrimitiveActionValidation {
  isValid: boolean;
  error?: string;
  missingPermissions?: string[];
}

// ============================================================================
// PERMISSIONS PAR ACTION
// ============================================================================

export interface ActionPermissions {
  actionType: PrimitiveActionType;
  requiresGameMaster: boolean; // Seul le MJ peut exécuter
  requiresActiveTurn: boolean; // Nécessite que ce soit le tour du joueur
  requiresOwnership: boolean; // Nécessite que le joueur possède la carte
  allowedGameStatuses: Array<'waiting' | 'playing' | 'finished'>; // Statuts autorisés
}

// Définition des permissions par action (P0)
export const PRIMITIVE_PERMISSIONS: Record<PrimitiveActionType, Partial<ActionPermissions>> = {
  // Distribution - MJ uniquement
  REVEAL_TOP_CARD: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  ASSIGN_TO_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  DISTRIBUTE_BATCH: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  DISTRIBUTE_TO_ZONE: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },

  // Actions cartes - Joueur pendant son tour
  PLAY_TO_CENTER: { requiresActiveTurn: true, requiresOwnership: true, allowedGameStatuses: ['playing'] },
  DISCARD: { requiresActiveTurn: true, requiresOwnership: true, allowedGameStatuses: ['playing'] },
  RETURN_TO_DECK: { requiresActiveTurn: true, requiresOwnership: true, allowedGameStatuses: ['playing'] },
  GIVE_TO_PLAYER: { requiresActiveTurn: true, requiresOwnership: true, allowedGameStatuses: ['playing'] },
  DRAW_TOP: { requiresActiveTurn: true, allowedGameStatuses: ['playing'] },
  DRAW_BOTTOM: { requiresActiveTurn: true, allowedGameStatuses: ['playing'] },
  DRAW_SPECIFIC: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  TAKE_FROM_DISCARD: { requiresActiveTurn: true, allowedGameStatuses: ['playing'] },
  TAKE_FROM_CENTER: { requiresActiveTurn: true, allowedGameStatuses: ['playing'] },
  FLIP_CARD: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  REVEAL_TO_ALL: { requiresActiveTurn: true, requiresOwnership: true, allowedGameStatuses: ['playing'] },
  REVEAL_TO_PLAYER: { requiresActiveTurn: true, requiresOwnership: true, allowedGameStatuses: ['playing'] },
  GROUP_CARDS: { requiresOwnership: true, allowedGameStatuses: ['playing'] },
  UNGROUP_CARDS: { requiresOwnership: true, allowedGameStatuses: ['playing'] },
  EXCHANGE_CARDS: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  SKIP_TURN: { requiresActiveTurn: true, allowedGameStatuses: ['playing'] },

  // Fin de tour - MJ uniquement
  CARDS_TO_DISCARD: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  CARDS_TO_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  CARDS_STAY_CENTER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  CARDS_TO_DECK: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },

  // Tours - MJ contrôle, joueur peut passer
  SET_FIRST_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  RANDOM_FIRST_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  PASS_TURN: { requiresActiveTurn: false, allowedGameStatuses: ['playing'] }, // MJ ou joueur actif
  PASS_TO_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  REVERSE_DIRECTION: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  SKIP_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  PAUSE_GAME: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },

  // Scoring - MJ uniquement
  ADD_POINTS: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  REMOVE_POINTS: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  DECLARE_ROUND_WINNER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  DECLARE_GAME_WINNER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  CANCEL_DECLARATION: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },

  // Gestion partie - MJ uniquement
  NEW_ROUND: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  RECALL_ALL_CARDS: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  END_GAME: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  UNDO_ACTION: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
};

// ============================================================================
// LOG D'ACTION PRIMITIVE (DB)
// ============================================================================

export interface PrimitiveActionLog {
  id: string;
  gameId: string;
  actorId: string;
  actionType: PrimitiveActionType;

  cardIds: string[] | null;
  sourceZoneId: string | null;
  targetZoneId: string | null;
  targetPlayerId: string | null;

  faceVisible: boolean | null;
  count: number | null;
  points: number | null;
  parameters: Record<string, any>;

  canBeUndone: boolean;
  undoneAt: string | null;

  createdAt: string;
}

// ============================================================================
// HELPERS / TYPES GUARDS
// ============================================================================

export function isGameMasterAction(actionType: PrimitiveActionType): boolean {
  return PRIMITIVE_PERMISSIONS[actionType]?.requiresGameMaster === true;
}

export function requiresActiveTurn(actionType: PrimitiveActionType): boolean {
  return PRIMITIVE_PERMISSIONS[actionType]?.requiresActiveTurn === true;
}

export function requiresOwnership(actionType: PrimitiveActionType): boolean {
  return PRIMITIVE_PERMISSIONS[actionType]?.requiresOwnership === true;
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const DISTRIBUTION_ACTIONS: PrimitiveActionType[] = [
  'REVEAL_TOP_CARD',
  'ASSIGN_TO_PLAYER',
  'DISTRIBUTE_BATCH',
  'DISTRIBUTE_TO_ZONE',
];

export const CARD_MANIPULATION_ACTIONS: PrimitiveActionType[] = [
  'PLAY_TO_CENTER',
  'DISCARD',
  'RETURN_TO_DECK',
  'GIVE_TO_PLAYER',
  'DRAW_TOP',
  'DRAW_BOTTOM',
  'TAKE_FROM_DISCARD',
  'TAKE_FROM_CENTER',
  'FLIP_CARD',
];

export const TURN_MANAGEMENT_ACTIONS: PrimitiveActionType[] = [
  'SET_FIRST_PLAYER',
  'RANDOM_FIRST_PLAYER',
  'PASS_TURN',
  'PASS_TO_PLAYER',
  'REVERSE_DIRECTION',
  'SKIP_PLAYER',
  'PAUSE_GAME',
];

export const SCORING_ACTIONS: PrimitiveActionType[] = [
  'ADD_POINTS',
  'REMOVE_POINTS',
  'DECLARE_ROUND_WINNER',
  'DECLARE_GAME_WINNER',
  'CANCEL_DECLARATION',
];

export const GAME_MANAGEMENT_ACTIONS: PrimitiveActionType[] = [
  'NEW_ROUND',
  'RECALL_ALL_CARDS',
  'END_GAME',
  'UNDO_ACTION',
];
