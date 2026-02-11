/**
 * Types pour les actions primitives du moteur universel v2
 * Ces primitives sont les briques atomiques que le MJ compose pour créer n'importe quel jeu
 */

// ============================================================================
// TYPES D'ACTIONS PRIMITIVES
// ============================================================================

export type PrimitiveActionType =
  // ==================== Distribution (DIS-*) ====================
  | 'REVEAL_TOP_CARD'      // DIS-01: Révéler la carte du dessus de la pioche (P0)
  | 'ASSIGN_TO_PLAYER'     // DIS-02: Attribuer carte révélée à un joueur (P0)
  | 'ASSIGN_FACE_CHOICE'   // DIS-03: Choisir face visible/cachée pour distribution (P0)
  | 'DISTRIBUTE_CATEGORY'  // DIS-04: Distribuer uniquement cartes d'une catégorie (P0)
  | 'DISTRIBUTE_BATCH'     // DIS-05: Distribution rapide de N cartes (P1)
  | 'DISTRIBUTE_TO_ZONE'   // DIS-07: Distribuer vers une zone spécifique (P1)
  | 'REDISTRIBUTE'         // DIS-08: Redistribuer sans remélanger (P1)

  // ==================== Deck & Mélange (DEC-*, MEL-*) ====================
  | 'SHUFFLE_DECK'         // MEL-01: Mélanger le deck complet (P0)
  | 'SHUFFLE_ZONE'         // MEL-02: Mélanger zone/catégorie spécifique (P1)
  | 'CUT_DECK'             // MEL-03: Couper le deck (P1)
  | 'ADD_CARDS_TO_DECK'    // DEC-07: Ajouter cartes au deck en cours (P1)
  | 'REMOVE_CARDS_FROM_DECK' // DEC-07: Retirer cartes du deck (P1)

  // ==================== Actions sur cartes (ACT-*) ====================
  | 'PLAY_TO_CENTER'       // ACT-01: Poser carte au centre (P0)
  | 'DISCARD'              // ACT-02: Défausser une carte (P0)
  | 'RETURN_TO_DECK'       // ACT-03: Remettre carte dans la pioche (P1)
  | 'GIVE_TO_PLAYER'       // ACT-04: Donner carte à un autre joueur (P1)
  | 'DRAW_TOP'             // ACT-05: Piocher carte du dessus (P0)
  | 'DRAW_BOTTOM'          // ACT-06: Piocher carte du dessous (P1)
  | 'DRAW_SPECIFIC'        // ACT-07: MJ pioche carte spécifique (P1)
  | 'TAKE_FROM_DISCARD'    // ACT-08: Prendre carte de la défausse (P0)
  | 'TAKE_FROM_CENTER'     // ACT-09: Prendre carte du centre (P0)
  | 'FLIP_CARD'            // ACT-10: Retourner une carte (P0)
  | 'REVEAL_TO_ALL'        // ACT-11: Révéler carte temporairement à tous (P1)
  | 'REVEAL_TO_PLAYER'     // ACT-12: Révéler carte à un joueur spécifique (P1)
  | 'GROUP_CARDS'          // ACT-13: Grouper plusieurs cartes ensemble (P1)
  | 'UNGROUP_CARDS'        // ACT-14: Dégrouper des cartes (P1)
  | 'EXCHANGE_CARDS'       // ACT-15: Échanger cartes entre joueurs (P1)
  | 'SKIP_TURN'            // ACT-16: Passer son tour (P0)

  // ==================== Fin de tour (FDT-*) ====================
  | 'CARDS_TO_DISCARD'     // FDT-01: Envoyer cartes centre → défausse (P0)
  | 'CARDS_TO_PLAYER'      // FDT-02: Attribuer cartes centre → joueur (pli) (P0)
  | 'CARDS_STAY_CENTER'    // FDT-03: Laisser cartes au centre (P0)
  | 'CARDS_TO_DECK'        // FDT-04: Remettre cartes dans pioche (P1)
  | 'RETURN_CARDS'         // FDT-05: Joueur rend cartes reçues ce tour (P0)

  // ==================== Zones & Tapis (TAP-*, ZONE-*) ====================
  | 'CREATE_ZONE'          // TAP-02: Créer zone/emplacement sur tapis (P1)
  | 'DELETE_ZONE'          // TAP-03: Supprimer zone (P1)
  | 'REPOSITION_ZONE'      // TAP-04: Déplacer/redimensionner zone (P1)
  | 'UPDATE_ZONE_CONFIG'   // TAP-05: Modifier propriétés zone (P1)
  | 'TOGGLE_ZONE'          // DEF-01: Activer/désactiver zone (P0)

  // ==================== Gestion tours (TOU-*) ====================
  | 'SET_FIRST_PLAYER'     // TOU-01: Désigner premier joueur manuellement (P0)
  | 'RANDOM_FIRST_PLAYER'  // TOU-02: Tirer au sort premier joueur (P0)
  | 'PASS_TURN'            // TOU-03: Passer la main (sens horaire) (P0)
  | 'PASS_TO_PLAYER'       // TOU-04: Donner main à joueur spécifique (P0)
  | 'REVERSE_DIRECTION'    // TOU-05: Inverser sens de rotation (P1)
  | 'SKIP_PLAYER'          // TOU-06: Sauter le tour d'un joueur (P1)
  | 'START_TIMER'          // TOU-07: Démarrer timer de tour (P2)
  | 'STOP_TIMER'           // TOU-07: Arrêter timer (P2)
  | 'PAUSE_GAME'           // TOU-08: Mettre en pause (P1)
  | 'RESUME_GAME'          // TOU-08: Reprendre (P1)

  // ==================== Visibilité (VIS-*) ====================
  | 'SHOW_HAND_TO_PLAYER'  // VIS-03: Montrer main d'un joueur à un autre (P1)
  | 'TOGGLE_OPEN_GAME'     // VIS-04: Activer/désactiver jeu ouvert (tous voient tout) (P1)
  | 'HIDE_OWN_CARDS'       // VIS-05: Cacher temporairement cartes d'un joueur (P2)
  | 'REVEAL_OWN_CARDS'     // VIS-05: Ré-afficher cartes cachées (P2)

  // ==================== Défausse (DEF-*) ====================
  | 'RECYCLE_DISCARD'      // DEF-04: Remélanger défausse → pioche (P1)

  // ==================== Scoring (SCO-*) ====================
  | 'ADD_POINTS'           // SCO-01: Ajouter points à un joueur (P0)
  | 'REMOVE_POINTS'        // SCO-01: Retirer points (P0)
  | 'AUTO_CALCULATE_SCORE' // SCO-02: Calcul automatique score (P2)
  | 'DECLARE_ROUND_WINNER' // SCO-04: Vainqueur de manche (P0)
  | 'DECLARE_GAME_WINNER'  // SCO-05: Vainqueur de partie (P0)
  | 'CANCEL_DECLARATION'   // SCO-06: Annuler déclaration (P1)

  // ==================== Règles (REG-*) ====================
  | 'UPDATE_RULES'         // REG-01/04: Modifier règles affichées (P0/P1)
  | 'LOAD_PREDEFINED_GAME' // REG-03: Charger jeu prédéfini (P2)

  // ==================== Marquage visuel (MAR-*) ====================
  | 'MARK_CARD'            // MAR-01: Ajouter indicateur visuel sur carte (P2)
  | 'UNMARK_CARD'          // MAR-02: Retirer marquage (P2)

  // ==================== Gestion partie (PAR-*) ====================
  | 'NEW_ROUND'            // PAR-01: Nouvelle donne/manche (P0)
  | 'TOGGLE_ROUND_PERSIST' // PAR-02: Garder/effacer cartes donne précédente (P0)
  | 'RECALL_ALL_CARDS'     // PAR-03: Rappeler toutes cartes → pioche (P0)
  | 'END_GAME'             // PAR-04: Terminer la partie (P0)
  | 'UNDO_ACTION'          // PAR-06: Annuler dernière action (P1)
  | 'SAVE_GAME'            // PAR-07: Sauvegarder état partie (P2)
  | 'LOAD_GAME'            // PAR-07: Charger partie sauvegardée (P2)

  // ==================== Deck avancé (P2) ====================
  | 'IMPORT_DECK'          // DEC-08: Importer deck depuis JSON (P2)
  | 'EXPORT_DECK'          // DEC-08: Exporter deck vers JSON (P2);


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
  targetPlayerIds?: string[]; // Plusieurs joueurs (pour distribution, échange)

  // ==================== Paramètres visibilité ====================
  faceVisible?: boolean; // Face visible ou cachée
  revealToPlayerIds?: string[]; // Révéler à joueurs spécifiques
  duration?: number; // Durée révélation temporaire (ms)

  // ==================== Paramètres distribution ====================
  count?: number; // Nombre de cartes (pour DISTRIBUTE_BATCH)
  distributeToAll?: boolean; // Distribuer à tous les joueurs
  categoryId?: string; // ID catégorie pour DISTRIBUTE_CATEGORY

  // ==================== Paramètres scoring ====================
  points?: number; // Points à ajouter/retirer
  reason?: string; // Raison du scoring (affichage)
  autoCalculate?: boolean; // Calcul automatique score

  // ==================== Paramètres groupage ====================
  groupId?: string; // ID du groupe (pour GROUP_CARDS/UNGROUP_CARDS)
  groupName?: string; // Nom du groupe

  // ==================== Paramètres tours ====================
  direction?: 'CLOCKWISE' | 'COUNTER_CLOCKWISE'; // Direction pour REVERSE_DIRECTION
  timerSeconds?: number; // Durée timer en secondes

  // ==================== Paramètres zones ====================
  zoneConfig?: {
    name?: string;
    type?: string;
    visibility?: string;
    defaultFace?: string;
    maxCapacity?: number;
    position?: { x: number; y: number; width: number; height: number };
  };

  // ==================== Paramètres règles ====================
  rulesMarkdown?: string; // Règles en markdown
  gameName?: string; // Nom du jeu
  predefinedGameId?: string; // ID jeu prédéfini

  // ==================== Paramètres marquage ====================
  markType?: 'BADGE' | 'COLOR' | 'ICON'; // Type de marquage
  markValue?: string; // Valeur du marquage (couleur, icône, texte)

  // ==================== Paramètres sauvegarde ====================
  snapshotId?: string; // ID snapshot pour LOAD_GAME
  exportFormat?: 'JSON' | 'CSV'; // Format export deck

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

// Définition des permissions par action
export const PRIMITIVE_PERMISSIONS: Record<PrimitiveActionType, Partial<ActionPermissions>> = {
  // ==================== Distribution - MJ uniquement ====================
  REVEAL_TOP_CARD: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  ASSIGN_TO_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  ASSIGN_FACE_CHOICE: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  DISTRIBUTE_CATEGORY: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  DISTRIBUTE_BATCH: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  DISTRIBUTE_TO_ZONE: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  REDISTRIBUTE: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },

  // ==================== Deck & Mélange - MJ uniquement ====================
  SHUFFLE_DECK: { requiresGameMaster: true, allowedGameStatuses: ['playing', 'waiting'] },
  SHUFFLE_ZONE: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  CUT_DECK: { requiresGameMaster: true, allowedGameStatuses: ['playing', 'waiting'] },
  ADD_CARDS_TO_DECK: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  REMOVE_CARDS_FROM_DECK: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },

  // ==================== Actions cartes - Joueur pendant son tour ====================
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

  // ==================== Fin de tour - MJ uniquement ====================
  CARDS_TO_DISCARD: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  CARDS_TO_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  CARDS_STAY_CENTER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  CARDS_TO_DECK: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  RETURN_CARDS: { requiresActiveTurn: true, allowedGameStatuses: ['playing'] },

  // ==================== Zones & Tapis - MJ uniquement ====================
  CREATE_ZONE: { requiresGameMaster: true, allowedGameStatuses: ['playing', 'waiting'] },
  DELETE_ZONE: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  REPOSITION_ZONE: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  UPDATE_ZONE_CONFIG: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  TOGGLE_ZONE: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },

  // ==================== Tours - MJ contrôle, joueur peut passer ====================
  SET_FIRST_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  RANDOM_FIRST_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  PASS_TURN: { requiresActiveTurn: false, allowedGameStatuses: ['playing'] }, // MJ ou joueur actif
  PASS_TO_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  REVERSE_DIRECTION: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  SKIP_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  START_TIMER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  STOP_TIMER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  PAUSE_GAME: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  RESUME_GAME: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },

  // ==================== Visibilité - MJ uniquement ====================
  SHOW_HAND_TO_PLAYER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  TOGGLE_OPEN_GAME: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  HIDE_OWN_CARDS: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  REVEAL_OWN_CARDS: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },

  // ==================== Défausse - MJ uniquement ====================
  RECYCLE_DISCARD: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },

  // ==================== Scoring - MJ uniquement ====================
  ADD_POINTS: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  REMOVE_POINTS: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  AUTO_CALCULATE_SCORE: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  DECLARE_ROUND_WINNER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  DECLARE_GAME_WINNER: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  CANCEL_DECLARATION: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },

  // ==================== Règles - MJ uniquement ====================
  UPDATE_RULES: { requiresGameMaster: true, allowedGameStatuses: ['playing', 'waiting'] },
  LOAD_PREDEFINED_GAME: { requiresGameMaster: true, allowedGameStatuses: ['waiting'] },

  // ==================== Marquage visuel - MJ uniquement ====================
  MARK_CARD: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  UNMARK_CARD: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },

  // ==================== Gestion partie - MJ uniquement ====================
  NEW_ROUND: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  TOGGLE_ROUND_PERSIST: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  RECALL_ALL_CARDS: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  END_GAME: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  UNDO_ACTION: { requiresGameMaster: true, allowedGameStatuses: ['playing'] },
  SAVE_GAME: { requiresGameMaster: true, allowedGameStatuses: ['playing', 'finished'] },
  LOAD_GAME: { requiresGameMaster: true, allowedGameStatuses: ['waiting'] },

  // ==================== Deck avancé - MJ uniquement ====================
  IMPORT_DECK: { requiresGameMaster: true, allowedGameStatuses: ['waiting'] },
  EXPORT_DECK: { requiresGameMaster: true, allowedGameStatuses: ['playing', 'waiting', 'finished'] },
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

// ============================================================================
// REGROUPEMENT D'ACTIONS PAR CATÉGORIE
// ============================================================================

export const DISTRIBUTION_ACTIONS: PrimitiveActionType[] = [
  'REVEAL_TOP_CARD',
  'ASSIGN_TO_PLAYER',
  'ASSIGN_FACE_CHOICE',
  'DISTRIBUTE_CATEGORY',
  'DISTRIBUTE_BATCH',
  'DISTRIBUTE_TO_ZONE',
  'REDISTRIBUTE',
];

export const DECK_SHUFFLE_ACTIONS: PrimitiveActionType[] = [
  'SHUFFLE_DECK',
  'SHUFFLE_ZONE',
  'CUT_DECK',
  'ADD_CARDS_TO_DECK',
  'REMOVE_CARDS_FROM_DECK',
];

export const CARD_MANIPULATION_ACTIONS: PrimitiveActionType[] = [
  'PLAY_TO_CENTER',
  'DISCARD',
  'RETURN_TO_DECK',
  'GIVE_TO_PLAYER',
  'DRAW_TOP',
  'DRAW_BOTTOM',
  'DRAW_SPECIFIC',
  'TAKE_FROM_DISCARD',
  'TAKE_FROM_CENTER',
  'FLIP_CARD',
  'REVEAL_TO_ALL',
  'REVEAL_TO_PLAYER',
  'GROUP_CARDS',
  'UNGROUP_CARDS',
  'EXCHANGE_CARDS',
  'SKIP_TURN',
];

export const END_OF_TURN_ACTIONS: PrimitiveActionType[] = [
  'CARDS_TO_DISCARD',
  'CARDS_TO_PLAYER',
  'CARDS_STAY_CENTER',
  'CARDS_TO_DECK',
  'RETURN_CARDS',
];

export const ZONE_MANAGEMENT_ACTIONS: PrimitiveActionType[] = [
  'CREATE_ZONE',
  'DELETE_ZONE',
  'REPOSITION_ZONE',
  'UPDATE_ZONE_CONFIG',
  'TOGGLE_ZONE',
];

export const TURN_MANAGEMENT_ACTIONS: PrimitiveActionType[] = [
  'SET_FIRST_PLAYER',
  'RANDOM_FIRST_PLAYER',
  'PASS_TURN',
  'PASS_TO_PLAYER',
  'REVERSE_DIRECTION',
  'SKIP_PLAYER',
  'START_TIMER',
  'STOP_TIMER',
  'PAUSE_GAME',
  'RESUME_GAME',
];

export const VISIBILITY_ACTIONS: PrimitiveActionType[] = [
  'SHOW_HAND_TO_PLAYER',
  'TOGGLE_OPEN_GAME',
  'HIDE_OWN_CARDS',
  'REVEAL_OWN_CARDS',
];

export const DISCARD_ACTIONS: PrimitiveActionType[] = [
  'RECYCLE_DISCARD',
];

export const SCORING_ACTIONS: PrimitiveActionType[] = [
  'ADD_POINTS',
  'REMOVE_POINTS',
  'AUTO_CALCULATE_SCORE',
  'DECLARE_ROUND_WINNER',
  'DECLARE_GAME_WINNER',
  'CANCEL_DECLARATION',
];

export const RULES_ACTIONS: PrimitiveActionType[] = [
  'UPDATE_RULES',
  'LOAD_PREDEFINED_GAME',
];

export const MARKING_ACTIONS: PrimitiveActionType[] = [
  'MARK_CARD',
  'UNMARK_CARD',
];

export const GAME_MANAGEMENT_ACTIONS: PrimitiveActionType[] = [
  'NEW_ROUND',
  'TOGGLE_ROUND_PERSIST',
  'RECALL_ALL_CARDS',
  'END_GAME',
  'UNDO_ACTION',
  'SAVE_GAME',
  'LOAD_GAME',
];

export const DECK_ADVANCED_ACTIONS: PrimitiveActionType[] = [
  'IMPORT_DECK',
  'EXPORT_DECK',
];

// ============================================================================
// ACTIONS PAR PRIORITÉ
// ============================================================================

export const P0_ACTIONS: PrimitiveActionType[] = [
  // Distribution
  'REVEAL_TOP_CARD',
  'ASSIGN_TO_PLAYER',
  'ASSIGN_FACE_CHOICE',
  'DISTRIBUTE_CATEGORY',
  // Mélange
  'SHUFFLE_DECK',
  // Actions cartes
  'PLAY_TO_CENTER',
  'DISCARD',
  'DRAW_TOP',
  'TAKE_FROM_DISCARD',
  'TAKE_FROM_CENTER',
  'FLIP_CARD',
  'SKIP_TURN',
  // Fin de tour
  'CARDS_TO_DISCARD',
  'CARDS_TO_PLAYER',
  'CARDS_STAY_CENTER',
  'RETURN_CARDS',
  // Zones
  'TOGGLE_ZONE',
  // Tours
  'SET_FIRST_PLAYER',
  'RANDOM_FIRST_PLAYER',
  'PASS_TURN',
  'PASS_TO_PLAYER',
  // Visibilité (implicite via zone.visibility)
  // Scoring
  'ADD_POINTS',
  'REMOVE_POINTS',
  'DECLARE_ROUND_WINNER',
  'DECLARE_GAME_WINNER',
  // Règles
  'UPDATE_RULES',
  // Gestion partie
  'NEW_ROUND',
  'TOGGLE_ROUND_PERSIST',
  'RECALL_ALL_CARDS',
  'END_GAME',
];

export const P1_ACTIONS: PrimitiveActionType[] = [
  // Distribution
  'DISTRIBUTE_BATCH',
  'DISTRIBUTE_TO_ZONE',
  'REDISTRIBUTE',
  // Deck
  'SHUFFLE_ZONE',
  'CUT_DECK',
  'ADD_CARDS_TO_DECK',
  'REMOVE_CARDS_FROM_DECK',
  // Actions cartes
  'RETURN_TO_DECK',
  'GIVE_TO_PLAYER',
  'DRAW_BOTTOM',
  'DRAW_SPECIFIC',
  'REVEAL_TO_ALL',
  'REVEAL_TO_PLAYER',
  'GROUP_CARDS',
  'UNGROUP_CARDS',
  'EXCHANGE_CARDS',
  // Fin de tour
  'CARDS_TO_DECK',
  // Zones
  'CREATE_ZONE',
  'DELETE_ZONE',
  'REPOSITION_ZONE',
  'UPDATE_ZONE_CONFIG',
  // Tours
  'REVERSE_DIRECTION',
  'SKIP_PLAYER',
  'PAUSE_GAME',
  'RESUME_GAME',
  // Visibilité
  'SHOW_HAND_TO_PLAYER',
  'TOGGLE_OPEN_GAME',
  // Défausse
  'RECYCLE_DISCARD',
  // Scoring
  'CANCEL_DECLARATION',
  // Gestion partie
  'UNDO_ACTION',
];

export const P2_ACTIONS: PrimitiveActionType[] = [
  // Tours
  'START_TIMER',
  'STOP_TIMER',
  // Visibilité
  'HIDE_OWN_CARDS',
  'REVEAL_OWN_CARDS',
  // Scoring
  'AUTO_CALCULATE_SCORE',
  // Règles
  'LOAD_PREDEFINED_GAME',
  // Marquage
  'MARK_CARD',
  'UNMARK_CARD',
  // Gestion partie
  'SAVE_GAME',
  'LOAD_GAME',
  // Deck avancé
  'IMPORT_DECK',
  'EXPORT_DECK',
];
