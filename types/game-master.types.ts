/**
 * Types pour le rôle Maître du Jeu (MJ) du moteur universel v2
 * Le MJ est l'arbitre absolu qui compose les primitives pour créer n'importe quel jeu
 */

// ============================================================================
// CONFIGURATION MAÎTRE DU JEU
// ============================================================================

export interface GameMaster {
  gameId: string;
  userId: string;
  isPlaying: boolean; // Le MJ participe comme joueur ou reste spectateur/arbitre
  omniscientMode: boolean; // Voit toutes les cartes de toutes les zones
  canUndo: boolean; // Peut annuler les actions
  createdAt: string;
}

// ============================================================================
// PERMISSIONS DU MAÎTRE DU JEU
// ============================================================================

export interface GameMasterPermissions {
  // Vision
  canSeeAllCards: boolean; // Voit toutes les cartes face cachée
  canSeeAllHands: boolean; // Voit les mains de tous les joueurs
  canSeeAllZones: boolean; // Voit toutes les zones

  // Gestion zones
  canCreateZones: boolean; // Créer nouvelles zones
  canModifyZones: boolean; // Modifier zones existantes
  canDeleteZones: boolean; // Supprimer zones
  canRepositionZones: boolean; // Déplacer emplacements sur tapis

  // Distribution
  canDistribute: boolean; // Distribuer cartes manuellement
  canRevealCards: boolean; // Révéler cartes
  canAssignCards: boolean; // Attribuer cartes aux joueurs
  canMoveAnyCard: boolean; // Déplacer n'importe quelle carte

  // Tours
  canControlTurns: boolean; // Gérer qui joue quand
  canSetFirstPlayer: boolean; // Désigner premier joueur
  canPassTurn: boolean; // Passer tour pour un joueur
  canSkipPlayer: boolean; // Sauter tour d'un joueur
  canReverseDirection: boolean; // Inverser sens rotation
  canPauseGame: boolean; // Mettre en pause

  // Scoring
  canAddPoints: boolean; // Ajouter/retirer points
  canDeclareWinner: boolean; // Déclarer vainqueur
  canModifyScores: boolean; // Modifier scores manuellement

  // Règles et partie
  canModifyRules: boolean; // Modifier règles affichées
  canEndGame: boolean; // Terminer partie
  canStartNewRound: boolean; // Lancer nouvelle manche
  canRecallCards: boolean; // Rappeler toutes cartes
  canUndo: boolean; // Annuler dernière action

  // Actions spéciales
  canFlipAnyCard: boolean; // Retourner n'importe quelle carte
  canGroupCards: boolean; // Grouper cartes
  canExchangeCards: boolean; // Échanger cartes entre joueurs
}

// ============================================================================
// PERMISSIONS PAR DÉFAUT
// ============================================================================

export const DEFAULT_GM_PERMISSIONS: GameMasterPermissions = {
  // Vision - MJ omniscient
  canSeeAllCards: true,
  canSeeAllHands: true,
  canSeeAllZones: true,

  // Zones - contrôle total
  canCreateZones: true,
  canModifyZones: true,
  canDeleteZones: true,
  canRepositionZones: true,

  // Distribution - contrôle total
  canDistribute: true,
  canRevealCards: true,
  canAssignCards: true,
  canMoveAnyCard: true,

  // Tours - contrôle total
  canControlTurns: true,
  canSetFirstPlayer: true,
  canPassTurn: true,
  canSkipPlayer: true,
  canReverseDirection: true,
  canPauseGame: true,

  // Scoring - contrôle total
  canAddPoints: true,
  canDeclareWinner: true,
  canModifyScores: true,

  // Règles et partie - contrôle total
  canModifyRules: true,
  canEndGame: true,
  canStartNewRound: true,
  canRecallCards: true,
  canUndo: true,

  // Actions spéciales - contrôle total
  canFlipAnyCard: true,
  canGroupCards: true,
  canExchangeCards: true,
};

// ============================================================================
// RÔLES DES PARTICIPANTS
// ============================================================================

export type ParticipantRole =
  | 'GM'         // Maître du Jeu - tous les droits
  | 'PLAYER'     // Joueur - actions limitées
  | 'SPECTATOR'; // Spectateur - lecture seule (P2)

export interface Participant {
  id: string;
  userId?: string;
  guestSessionId?: string;
  name: string;
  role: ParticipantRole;
  isActive: boolean;
  score: number;
}

// ============================================================================
// ACTIONS CONTEXTUELLES DU MJ
// ============================================================================

export interface GMContextualAction {
  id: string;
  label: string; // "Distribuer", "Révéler carte", "Attribuer à..."
  icon: string; // Lucide icon name
  actionType: string; // Type de primitive à exécuter
  context: 'DECK' | 'CARD' | 'PLAYER' | 'ZONE' | 'TURN' | 'GAME'; // Contexte d'affichage
  requiresSelection?: boolean; // Nécessite sélection (carte, joueur, etc.)
  confirmationRequired?: boolean; // Demande confirmation
}

// ============================================================================
// ACTIONS CONTEXTUELLES PRÉDÉFINIES
// ============================================================================

export const GM_CONTEXTUAL_ACTIONS: GMContextualAction[] = [
  // Actions sur le deck
  {
    id: 'reveal-top-card',
    label: 'Révéler carte suivante',
    icon: 'eye',
    actionType: 'REVEAL_TOP_CARD',
    context: 'DECK',
  },
  {
    id: 'shuffle-deck',
    label: 'Mélanger le deck',
    icon: 'shuffle',
    actionType: 'SHUFFLE_DECK',
    context: 'DECK',
  },

  // Actions sur une carte
  {
    id: 'assign-to-player',
    label: 'Attribuer à un joueur',
    icon: 'user-plus',
    actionType: 'ASSIGN_TO_PLAYER',
    context: 'CARD',
    requiresSelection: true,
  },
  {
    id: 'flip-card',
    label: 'Retourner',
    icon: 'flip-horizontal',
    actionType: 'FLIP_CARD',
    context: 'CARD',
  },
  {
    id: 'move-to-zone',
    label: 'Déplacer vers zone',
    icon: 'move',
    actionType: 'MOVE_CARD',
    context: 'CARD',
    requiresSelection: true,
  },

  // Actions sur un joueur
  {
    id: 'set-first-player',
    label: 'Définir comme premier joueur',
    icon: 'flag',
    actionType: 'SET_FIRST_PLAYER',
    context: 'PLAYER',
  },
  {
    id: 'give-turn',
    label: 'Donner la main',
    icon: 'hand',
    actionType: 'PASS_TO_PLAYER',
    context: 'PLAYER',
  },
  {
    id: 'add-points',
    label: 'Ajouter des points',
    icon: 'plus-circle',
    actionType: 'ADD_POINTS',
    context: 'PLAYER',
    requiresSelection: true,
  },
  {
    id: 'distribute-cards',
    label: 'Distribuer N cartes',
    icon: 'layers',
    actionType: 'DISTRIBUTE_BATCH',
    context: 'PLAYER',
    requiresSelection: true,
  },

  // Actions sur zone
  {
    id: 'create-zone',
    label: 'Créer zone',
    icon: 'square-plus',
    actionType: 'CREATE_ZONE',
    context: 'ZONE',
  },
  {
    id: 'clear-zone',
    label: 'Vider zone',
    icon: 'x-circle',
    actionType: 'CLEAR_ZONE',
    context: 'ZONE',
    confirmationRequired: true,
  },

  // Actions sur tour
  {
    id: 'pass-turn',
    label: 'Passer au suivant',
    icon: 'arrow-right',
    actionType: 'PASS_TURN',
    context: 'TURN',
  },
  {
    id: 'reverse-direction',
    label: 'Inverser sens',
    icon: 'refresh-ccw',
    actionType: 'REVERSE_DIRECTION',
    context: 'TURN',
  },
  {
    id: 'pause-game',
    label: 'Mettre en pause',
    icon: 'pause',
    actionType: 'PAUSE_GAME',
    context: 'TURN',
  },

  // Actions sur partie
  {
    id: 'new-round',
    label: 'Nouvelle manche',
    icon: 'rotate-cw',
    actionType: 'NEW_ROUND',
    context: 'GAME',
    confirmationRequired: true,
  },
  {
    id: 'recall-all-cards',
    label: 'Rappeler toutes les cartes',
    icon: 'undo-2',
    actionType: 'RECALL_ALL_CARDS',
    context: 'GAME',
    confirmationRequired: true,
  },
  {
    id: 'end-game',
    label: 'Terminer la partie',
    icon: 'flag-off',
    actionType: 'END_GAME',
    context: 'GAME',
    confirmationRequired: true,
  },
];

// ============================================================================
// PANNEAU DE CONTRÔLE MJ
// ============================================================================

export interface GMControlPanelTab {
  id: string;
  label: string;
  icon: string;
  component: string; // Nom du composant React à afficher
}

export const GM_CONTROL_PANEL_TABS: GMControlPanelTab[] = [
  {
    id: 'distribution',
    label: 'Distribution',
    icon: 'layers',
    component: 'GMDistributionPanel',
  },
  {
    id: 'turns',
    label: 'Tours',
    icon: 'rotate-cw',
    component: 'GMTurnsPanel',
  },
  {
    id: 'zones',
    label: 'Zones',
    icon: 'layout-grid',
    component: 'GMZonesPanel',
  },
  {
    id: 'scoring',
    label: 'Scoring',
    icon: 'trophy',
    component: 'GMScoringPanel',
  },
  {
    id: 'rules',
    label: 'Règles',
    icon: 'book-open',
    component: 'GMRulesPanel',
  },
  {
    id: 'history',
    label: 'Historique',
    icon: 'history',
    component: 'GMHistoryPanel',
  },
];

// ============================================================================
// ÉTAT DU MJ (UI)
// ============================================================================

export interface GMUIState {
  isPanelOpen: boolean; // Panneau de contrôle ouvert/fermé
  activeTab: string; // Onglet actif du panneau
  selectedCardIds: string[]; // Cartes sélectionnées
  selectedPlayerId?: string; // Joueur sélectionné
  selectedZoneId?: string; // Zone sélectionnée
  revealedCardId?: string; // Carte actuellement révélée
  isDistributing: boolean; // En mode distribution
  pendingAction?: GMPendingAction; // Action en attente de confirmation
}

export interface GMPendingAction {
  actionType: string;
  label: string;
  requiresInput?: boolean;
  inputType?: 'NUMBER' | 'TEXT' | 'SELECT';
  inputLabel?: string;
  options?: Array<{ value: string; label: string }>;
  onConfirm: (value?: any) => void;
  onCancel: () => void;
}

// ============================================================================
// STATISTIQUES MJ
// ============================================================================

export interface GMGameStats {
  totalCards: number;
  cardsInDeck: number;
  cardsDistributed: number;
  cardsInCenter: number;
  cardsInDiscard: number;
  totalActionsExecuted: number;
  currentRound: number;
  turnNumber: number;
  activePlayers: number;
  totalPlayers: number;
}

// ============================================================================
// HELPERS / TYPE GUARDS
// ============================================================================

export function isGameMaster(participant: Participant): boolean {
  return participant.role === 'GM';
}

export function isPlayer(participant: Participant): boolean {
  return participant.role === 'PLAYER';
}

export function isSpectator(participant: Participant): boolean {
  return participant.role === 'SPECTATOR';
}

export function canExecuteAction(
  participant: Participant,
  permissions: GameMasterPermissions,
  actionType: string
): boolean {
  if (isGameMaster(participant)) {
    return true; // MJ peut tout faire
  }

  // Les joueurs ont des permissions limitées
  // (géré par PRIMITIVE_PERMISSIONS dans primitives.types.ts)
  return false;
}

export function getContextualActions(
  role: ParticipantRole,
  context: GMContextualAction['context']
): GMContextualAction[] {
  if (role !== 'GM') return []; // Seul le MJ a des actions contextuelles

  return GM_CONTEXTUAL_ACTIONS.filter(action => action.context === context);
}

// ============================================================================
// CONFIGURATION INITIALE
// ============================================================================

export function createGameMaster(gameId: string, userId: string): GameMaster {
  return {
    gameId,
    userId,
    isPlaying: false, // Par défaut, MJ arbitre uniquement
    omniscientMode: true,
    canUndo: true,
    createdAt: new Date().toISOString(),
  };
}

export function createDefaultGMUIState(): GMUIState {
  return {
    isPanelOpen: true, // Ouvert par défaut pour le MJ
    activeTab: 'distribution',
    selectedCardIds: [],
    isDistributing: false,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface GMValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateGMAction(
  gm: GameMaster,
  actionType: string,
  gameStatus: string
): GMValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Vérifier que le jeu est en cours
  if (gameStatus !== 'playing' && actionType !== 'END_GAME') {
    errors.push('La partie doit être en cours pour exécuter cette action');
  }

  // Vérifier que le MJ peut annuler si c'est une action UNDO
  if (actionType === 'UNDO_ACTION' && !gm.canUndo) {
    errors.push('Le MJ n\'a pas la permission d\'annuler des actions');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const GM_COLORS = {
  primary: '#ffd100', // Jaune SuperTilt
  secondary: '#101820', // Anthracite
  accent: '#3b82f6', // Blue-500
  success: '#10b981', // Green-500
  warning: '#f59e0b', // Amber-500
  danger: '#ef4444', // Red-500
} as const;

export const GM_BADGE_TEXT = {
  FR: 'MJ',
  EN: 'GM',
  ES: 'DJ',
  DE: 'SL',
} as const;
