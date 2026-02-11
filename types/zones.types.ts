/**
 * Types pour les zones dynamiques du moteur universel v2
 * Les zones sont les emplacements où se trouvent les cartes (pioche, mains, centre, défausse, custom)
 */

// ============================================================================
// TYPES DE ZONES
// ============================================================================

export type ZoneType =
  | 'DECK'      // Pioche - source principale des cartes
  | 'HAND'      // Main d'un joueur spécifique
  | 'CENTER'    // Centre/tapis - zone commune visible
  | 'DISCARD'   // Défausse - cartes jouées/écartées
  | 'CUSTOM';   // Zone personnalisée (atout, river, crib, plis, etc.)

// ============================================================================
// VISIBILITÉ DES ZONES
// ============================================================================

export type ZoneVisibility =
  | 'PRIVATE'   // Personne ne voit (cartes face cachée pour tous sauf MJ)
  | 'OWNER'     // Seul le propriétaire voit (main du joueur)
  | 'ALL'       // Tous les joueurs voient
  | 'GM_ONLY';  // Seul le MJ voit

// ============================================================================
// FACE DES CARTES
// ============================================================================

export type CardFace = 'VISIBLE' | 'HIDDEN';

// ============================================================================
// INTERFACE ZONE DYNAMIQUE
// ============================================================================

export interface DynamicZone {
  id: string;
  gameId: string;
  name: string;
  type: ZoneType;

  // Propriétés de visibilité
  visibility: ZoneVisibility;
  defaultFace: CardFace; // Face par défaut quand carte arrive

  // Propriétés de capacité
  isOrdered: boolean; // true = ordre compte (pioche, défausse), false = libre (main, centre)
  maxCapacity?: number; // undefined = illimité

  // Propriétaire (undefined = zone globale)
  ownerPlayerId?: string; // Pour zones HAND ou zones custom d'un joueur

  // État
  isEnabled: boolean; // false = zone désactivée temporairement

  // Position visuelle (pour emplacements sur tapis - TAP-02)
  position?: ZonePosition;

  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// POSITION VISUELLE SUR LE TAPIS
// ============================================================================

export interface ZonePosition {
  x: number; // Position X en pixels ou %
  y: number; // Position Y en pixels ou %
  width: number; // Largeur
  height: number; // Hauteur
  rotation?: number; // Rotation en degrés (optionnel)
  zIndex?: number; // Ordre d'affichage (optionnel)
}

// ============================================================================
// CONFIGURATION DE ZONE
// ============================================================================

export interface ZoneConfig {
  name: string;
  type: ZoneType;
  visibility: ZoneVisibility;
  defaultFace: CardFace;
  isOrdered: boolean;
  maxCapacity?: number;
  ownerPlayerId?: string;
  position?: ZonePosition;
}

// ============================================================================
// ZONES PAR DÉFAUT (CRÉÉES AUTOMATIQUEMENT)
// ============================================================================

export const DEFAULT_ZONES: Omit<ZoneConfig, 'ownerPlayerId'>[] = [
  {
    name: 'Pioche',
    type: 'DECK',
    visibility: 'PRIVATE', // Personne ne voit sauf MJ
    defaultFace: 'HIDDEN',
    isOrdered: true, // L'ordre compte
    maxCapacity: undefined, // Illimité
  },
  {
    name: 'Centre',
    type: 'CENTER',
    visibility: 'ALL', // Tous voient
    defaultFace: 'VISIBLE',
    isOrdered: false, // Ordre libre
    maxCapacity: undefined,
  },
  {
    name: 'Défausse',
    type: 'DISCARD',
    visibility: 'ALL',
    defaultFace: 'VISIBLE',
    isOrdered: true,
    maxCapacity: undefined,
  },
];

// ============================================================================
// TEMPLATE ZONE MAIN JOUEUR
// ============================================================================

export function createPlayerHandZoneConfig(playerName: string, playerId: string): ZoneConfig {
  return {
    name: `Main de ${playerName}`,
    type: 'HAND',
    visibility: 'OWNER', // Seul le joueur voit
    defaultFace: 'HIDDEN', // Cartes arrivent face cachée
    isOrdered: false,
    maxCapacity: undefined,
    ownerPlayerId: playerId,
  };
}

// ============================================================================
// PROPRIÉTÉS DES ZONES PAR TYPE
// ============================================================================

export interface ZoneTypeProperties {
  type: ZoneType;
  defaultVisibility: ZoneVisibility;
  defaultFace: CardFace;
  defaultOrdered: boolean;
  description: string;
  icon: string; // Lucide icon name
}

export const ZONE_TYPE_PROPERTIES: Record<ZoneType, ZoneTypeProperties> = {
  DECK: {
    type: 'DECK',
    defaultVisibility: 'PRIVATE',
    defaultFace: 'HIDDEN',
    defaultOrdered: true,
    description: 'Pioche - Source des cartes à distribuer',
    icon: 'layers',
  },
  HAND: {
    type: 'HAND',
    defaultVisibility: 'OWNER',
    defaultFace: 'HIDDEN',
    defaultOrdered: false,
    description: 'Main d\'un joueur - Visible uniquement par le propriétaire',
    icon: 'hand',
  },
  CENTER: {
    type: 'CENTER',
    defaultVisibility: 'ALL',
    defaultFace: 'VISIBLE',
    defaultOrdered: false,
    description: 'Centre/Tapis - Zone commune visible de tous',
    icon: 'circle-dot',
  },
  DISCARD: {
    type: 'DISCARD',
    defaultVisibility: 'ALL',
    defaultFace: 'VISIBLE',
    defaultOrdered: true,
    description: 'Défausse - Cartes jouées ou écartées',
    icon: 'trash-2',
  },
  CUSTOM: {
    type: 'CUSTOM',
    defaultVisibility: 'ALL',
    defaultFace: 'VISIBLE',
    defaultOrdered: false,
    description: 'Zone personnalisée - Configurable par le MJ',
    icon: 'square-dashed',
  },
};

// ============================================================================
// CARTES DANS UNE ZONE
// ============================================================================

export interface CardInZone {
  id: string; // ID game_card
  cardId: string; // ID carte du deck
  zoneId: string;
  ownerId?: string; // Propriétaire si zone HAND
  position: number;
  faceVisible: boolean;
  groupId?: string; // Si carte fait partie d'un groupe
}

// ============================================================================
// STATISTIQUES D'UNE ZONE
// ============================================================================

export interface ZoneStats {
  zoneId: string;
  zoneName: string;
  totalCards: number;
  cardsVisible: number;
  cardsHidden: number;
  isFull: boolean; // true si maxCapacity atteint
  remainingCapacity?: number;
}

// ============================================================================
// ACTIONS SUR ZONES
// ============================================================================

export interface ZoneAction {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'REPOSITION';
  zoneId?: string;
  config?: Partial<ZoneConfig>;
  position?: ZonePosition;
}

// ============================================================================
// FILTRES DE ZONES
// ============================================================================

export interface ZoneFilter {
  type?: ZoneType;
  visibility?: ZoneVisibility;
  ownerPlayerId?: string;
  isEnabled?: boolean;
  hasCapacity?: boolean; // Zones avec places disponibles
}

// ============================================================================
// HELPERS / TYPE GUARDS
// ============================================================================

export function isGlobalZone(zone: DynamicZone): boolean {
  return zone.ownerPlayerId === undefined;
}

export function isPlayerZone(zone: DynamicZone): boolean {
  return zone.ownerPlayerId !== undefined;
}

export function isFullZone(zone: DynamicZone, currentCardCount: number): boolean {
  if (zone.maxCapacity === undefined) return false;
  return currentCardCount >= zone.maxCapacity;
}

export function canAddCards(zone: DynamicZone, currentCardCount: number, cardsToAdd: number): boolean {
  if (zone.maxCapacity === undefined) return true;
  return currentCardCount + cardsToAdd <= zone.maxCapacity;
}

export function getVisibleZonesForPlayer(
  zones: DynamicZone[],
  playerId: string,
  isGameMaster: boolean
): DynamicZone[] {
  if (isGameMaster) return zones; // MJ voit toutes les zones

  return zones.filter(zone => {
    switch (zone.visibility) {
      case 'ALL':
        return true;
      case 'OWNER':
        return zone.ownerPlayerId === playerId;
      case 'PRIVATE':
      case 'GM_ONLY':
        return false;
      default:
        return false;
    }
  });
}

export function canPlayerSeeCards(
  zone: DynamicZone,
  playerId: string,
  isGameMaster: boolean
): boolean {
  if (isGameMaster) return true; // MJ voit toujours

  switch (zone.visibility) {
    case 'ALL':
      return true;
    case 'OWNER':
      return zone.ownerPlayerId === playerId;
    case 'PRIVATE':
    case 'GM_ONLY':
      return false;
    default:
      return false;
  }
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const DEFAULT_ZONE_NAMES = {
  DECK: 'Pioche',
  CENTER: 'Centre',
  DISCARD: 'Défausse',
} as const;

export const ZONE_COLORS = {
  DECK: '#3b82f6', // blue-500
  HAND: '#10b981', // green-500
  CENTER: '#ffd100', // yellow SuperTilt
  DISCARD: '#ef4444', // red-500
  CUSTOM: '#8b5cf6', // purple-500
} as const;

// ============================================================================
// EXEMPLES DE ZONES CUSTOM PRÉDÉFINIES
// ============================================================================

export const CUSTOM_ZONE_TEMPLATES: Record<string, Omit<ZoneConfig, 'ownerPlayerId'>> = {
  // Poker
  RIVER: {
    name: 'River',
    type: 'CUSTOM',
    visibility: 'ALL',
    defaultFace: 'VISIBLE',
    isOrdered: true,
    maxCapacity: 5,
  },
  // Belote
  ATOUT: {
    name: 'Atout',
    type: 'CUSTOM',
    visibility: 'ALL',
    defaultFace: 'VISIBLE',
    isOrdered: false,
    maxCapacity: 1,
  },
  // Cribbage
  CRIB: {
    name: 'Crib',
    type: 'CUSTOM',
    visibility: 'GM_ONLY', // Caché jusqu'à révélation
    defaultFace: 'HIDDEN',
    isOrdered: false,
    maxCapacity: 4,
  },
  // Plis d'un joueur
  TRICKS_PILE: {
    name: 'Plis',
    type: 'CUSTOM',
    visibility: 'OWNER',
    defaultFace: 'HIDDEN',
    isOrdered: true,
    maxCapacity: undefined,
  },
};

// ============================================================================
// VALIDATION
// ============================================================================

export interface ZoneValidation {
  isValid: boolean;
  errors: string[];
}

export function validateZoneConfig(config: Partial<ZoneConfig>): ZoneValidation {
  const errors: string[] = [];

  if (!config.name || config.name.trim() === '') {
    errors.push('Le nom de la zone est requis');
  }

  if (!config.type) {
    errors.push('Le type de zone est requis');
  }

  if (config.maxCapacity !== undefined && config.maxCapacity < 1) {
    errors.push('La capacité maximale doit être ≥ 1');
  }

  if (config.type === 'HAND' && !config.ownerPlayerId) {
    errors.push('Une zone HAND doit avoir un propriétaire');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
