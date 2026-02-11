/**
 * Types pour l'état complet d'une partie v2
 * Rassemble tous les éléments du moteur universel
 */

import type { GameMaster, Participant } from './game-master.types';
import type { DynamicZone, CardInZone } from './zones.types';
import type { PrimitiveActionLog } from './primitives.types';

// ============================================================================
// ÉTAT DE JEU COMPLET V2
// ============================================================================

export interface GameStateV2 {
  // Informations de base
  game: GameInfo;

  // Maître du Jeu
  gameMaster: GameMaster;

  // Participants
  players: Participant[];

  // Zones dynamiques
  zones: DynamicZone[];

  // Cartes dans les zones
  cards: CardInZone[];

  // État des tours
  turnState: TurnState;

  // Règles du jeu
  rules?: GameRules;

  // Configuration du tapis
  tapConfig: TapConfig;

  // Métadonnées
  metadata: GameMetadata;
}

// ============================================================================
// INFORMATIONS DE BASE
// ============================================================================

export interface GameInfo {
  id: string;
  code: string; // Code à 6 caractères
  status: GameStatus;
  gameMasterId: string;
  deckId: string;
  currentRound: number;
  maxPlayers: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export type GameStatus = 'waiting' | 'playing' | 'finished';

// ============================================================================
// ÉTAT DES TOURS
// ============================================================================

export interface TurnState {
  currentPlayerId?: string; // Joueur dont c'est le tour (undefined si pas commencé)
  turnOrder: string[]; // Array d'IDs game_players dans l'ordre
  direction: TurnDirection;
  turnNumber: number;
  timer?: TurnTimer;
  isPaused: boolean;
  updatedAt: string;
}

export type TurnDirection = 'CLOCKWISE' | 'COUNTER_CLOCKWISE';

export interface TurnTimer {
  seconds: number; // Durée en secondes
  startedAt: string; // Timestamp du début
  remainingSeconds?: number; // Calculé côté client
}

// ============================================================================
// RÈGLES DU JEU
// ============================================================================

export interface GameRules {
  markdown: string; // Règles en markdown
  gameName?: string; // Nom du jeu (ex: "Belote", "Poker")
  predefinedGameId?: string; // ID si chargé depuis bibliothèque
  updatedAt: string;
}

// ============================================================================
// CONFIGURATION DU TAPIS
// ============================================================================

export interface TapConfig {
  backgroundColor: string; // Couleur ou texture du tapis
  backgroundImage?: string; // Image de fond optionnelle
  width: number; // Largeur en pixels
  height: number; // Hauteur en pixels
  gridEnabled: boolean; // Afficher grille d'alignement
  gridSize: number; // Taille de la grille en pixels
}

export const DEFAULT_TAP_CONFIG: TapConfig = {
  backgroundColor: '#047857', // green-700 (tapis de jeu classique)
  width: 1200,
  height: 800,
  gridEnabled: false,
  gridSize: 50,
};

// ============================================================================
// MÉTADONNÉES
// ============================================================================

export interface GameMetadata {
  totalActionsExecuted: number;
  lastActionAt?: string;
  totalRounds: number;
  averageTurnDuration?: number; // En secondes
  longestTurn?: TurnRecord;
}

export interface TurnRecord {
  playerId: string;
  playerName: string;
  duration: number; // En secondes
  round: number;
  turnNumber: number;
}

// ============================================================================
// VUE JOUEUR (FILTRÉE SELON PERMISSIONS)
// ============================================================================

export interface PlayerGameView {
  // Informations de base (toujours visibles)
  game: GameInfo;
  players: Participant[];
  turnState: TurnState;
  rules?: GameRules;
  tapConfig: TapConfig;

  // Zones visibles par ce joueur
  visibleZones: DynamicZone[];

  // Cartes visibles par ce joueur (selon zone.visibility)
  visibleCards: CardInZone[];

  // ID du joueur (pour déterminer "c'est mon tour")
  currentPlayerId: string;

  // Est-ce que c'est le tour de ce joueur
  isMyTurn: boolean;

  // Est-ce que ce joueur est le MJ
  isGameMaster: boolean;
}

// ============================================================================
// VUE MJ (OMNISCIENTE)
// ============================================================================

export interface GMGameView extends GameStateV2 {
  // Toutes les infos de GameStateV2 +

  // Historique des actions
  actionsHistory: PrimitiveActionLog[];

  // Statistiques
  stats: GameStats;

  // Cartes actuellement sélectionnées (UI)
  selectedCardIds: string[];

  // Carte révélée en attente d'attribution
  revealedCard?: CardInZone;
}

// ============================================================================
// STATISTIQUES
// ============================================================================

export interface GameStats {
  totalCards: number;
  cardsByZone: Record<string, number>; // zoneId -> count
  cardsByPlayer: Record<string, number>; // playerId -> count
  cardsVisible: number;
  cardsHidden: number;
  totalActionsExecuted: number;
  actionsByType: Record<string, number>; // actionType -> count
  currentRound: number;
  turnNumber: number;
  activePlayers: number;
  totalPlayers: number;
  averageScore: number;
  leaderPlayerId?: string;
}

// ============================================================================
// MISES À JOUR EN TEMPS RÉEL
// ============================================================================

export type GameUpdateType =
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'GAME_STARTED'
  | 'GAME_ENDED'
  | 'CARD_MOVED'
  | 'ZONE_CREATED'
  | 'ZONE_UPDATED'
  | 'ZONE_DELETED'
  | 'TURN_PASSED'
  | 'TURN_CHANGED'
  | 'SCORE_UPDATED'
  | 'ROUND_STARTED'
  | 'ROUND_ENDED'
  | 'ACTION_EXECUTED'
  | 'ACTION_UNDONE';

export interface GameUpdate {
  type: GameUpdateType;
  gameId: string;
  timestamp: string;
  data: Record<string, any>;
  actorId?: string; // Qui a provoqué la mise à jour
}

// ============================================================================
// SNAPSHOT DE PARTIE (SAUVEGARDE)
// ============================================================================

export interface GameSnapshot {
  version: string; // Version du schéma (ex: "2.0.0")
  snapshotAt: string;
  gameState: GameStateV2;
  actionsHistory: PrimitiveActionLog[];
  checksum: string; // Pour validation intégrité
}

// ============================================================================
// CRÉATION DE PARTIE V2
// ============================================================================

export interface CreateGameV2Params {
  deckId: string;
  maxPlayers: number;
  gameMasterUserId: string;
  gameMasterIsPlaying: boolean;
  tapConfig?: Partial<TapConfig>;
  rules?: {
    markdown: string;
    gameName?: string;
  };
}

// ============================================================================
// REJOINDRE UNE PARTIE V2
// ============================================================================

export interface JoinGameV2Params {
  gameCode: string;
  userId?: string; // undefined = guest
  guestName?: string;
  guestSessionId?: string;
}

export interface JoinGameV2Result {
  success: boolean;
  gameId?: string;
  playerId?: string;
  error?: string;
  gameState?: PlayerGameView;
}

// ============================================================================
// DÉMARRER UNE PARTIE V2
// ============================================================================

export interface StartGameV2Params {
  gameId: string;
  shuffleDeck: boolean; // Mélanger avant de commencer
  firstPlayerId?: string; // undefined = MJ choisit manuellement
  distributeInitially: boolean; // Distribuer automatiquement au démarrage (false = distribution manuelle)
  initialCardsPerPlayer?: number; // Si distributeInitially = true
}

// ============================================================================
// NOUVELLE MANCHE V2
// ============================================================================

export interface NewRoundV2Params {
  gameId: string;
  recallAllCards: boolean; // Rappeler toutes cartes dans pioche
  shuffleDeck: boolean; // Remélanger
  resetScores: boolean; // Remettre scores à zéro
  firstPlayerId?: string; // Qui commence (undefined = même ordre)
}

// ============================================================================
// HELPERS / UTILITIES
// ============================================================================

export function getPlayerById(gameState: GameStateV2, playerId: string): Participant | undefined {
  return gameState.players.find(p => p.id === playerId);
}

export function getZoneById(gameState: GameStateV2, zoneId: string): DynamicZone | undefined {
  return gameState.zones.find(z => z.id === zoneId);
}

export function getCardsInZone(gameState: GameStateV2, zoneId: string): CardInZone[] {
  return gameState.cards.filter(c => c.zoneId === zoneId);
}

export function getPlayerHand(gameState: GameStateV2, playerId: string): CardInZone[] {
  const handZone = gameState.zones.find(z => z.type === 'HAND' && z.ownerPlayerId === playerId);
  if (!handZone) return [];
  return getCardsInZone(gameState, handZone.id);
}

export function getCurrentPlayer(gameState: GameStateV2): Participant | undefined {
  if (!gameState.turnState.currentPlayerId) return undefined;
  return getPlayerById(gameState, gameState.turnState.currentPlayerId);
}

export function getActivePlayers(gameState: GameStateV2): Participant[] {
  return gameState.players.filter(p => p.isActive && p.role === 'PLAYER');
}

export function isGameWaiting(gameState: GameStateV2): boolean {
  return gameState.game.status === 'waiting';
}

export function isGamePlaying(gameState: GameStateV2): boolean {
  return gameState.game.status === 'playing';
}

export function isGameFinished(gameState: GameStateV2): boolean {
  return gameState.game.status === 'finished';
}

export function canStartGame(gameState: GameStateV2): boolean {
  const activePlayers = getActivePlayers(gameState);
  return (
    gameState.game.status === 'waiting' &&
    activePlayers.length >= 2 &&
    activePlayers.length <= gameState.game.maxPlayers
  );
}

export function getLeaderboard(gameState: GameStateV2): Participant[] {
  return [...gameState.players]
    .filter(p => p.role === 'PLAYER')
    .sort((a, b) => b.score - a.score);
}

export function getGameDuration(gameState: GameStateV2): number | undefined {
  if (!gameState.game.startedAt) return undefined;

  const endTime = gameState.game.finishedAt
    ? new Date(gameState.game.finishedAt).getTime()
    : Date.now();

  const startTime = new Date(gameState.game.startedAt).getTime();

  return Math.floor((endTime - startTime) / 1000); // En secondes
}

export function getRemainingTimerSeconds(turnState: TurnState): number | undefined {
  if (!turnState.timer) return undefined;

  const elapsed = Date.now() - new Date(turnState.timer.startedAt).getTime();
  const remaining = turnState.timer.seconds - Math.floor(elapsed / 1000);

  return Math.max(0, remaining);
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface GameStateValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateGameState(gameState: GameStateV2): GameStateValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Vérifier qu'il y a au moins les zones par défaut
  const hasDefaultZones = ['DECK', 'CENTER', 'DISCARD'].every(type =>
    gameState.zones.some(z => z.type === type)
  );

  if (!hasDefaultZones) {
    errors.push('Les zones par défaut (DECK, CENTER, DISCARD) doivent exister');
  }

  // Vérifier que chaque joueur actif a une zone HAND
  const activePlayers = getActivePlayers(gameState);
  activePlayers.forEach(player => {
    const hasHand = gameState.zones.some(
      z => z.type === 'HAND' && z.ownerPlayerId === player.id
    );
    if (!hasHand) {
      errors.push(`Le joueur ${player.name} n'a pas de zone HAND`);
    }
  });

  // Vérifier que toutes les cartes sont dans des zones existantes
  gameState.cards.forEach(card => {
    const zoneExists = gameState.zones.some(z => z.id === card.zoneId);
    if (!zoneExists) {
      errors.push(`La carte ${card.id} est dans une zone inexistante (${card.zoneId})`);
    }
  });

  // Vérifier turnOrder
  if (gameState.turnState.turnOrder.length !== activePlayers.length) {
    warnings.push('Le turnOrder ne correspond pas au nombre de joueurs actifs');
  }

  // Vérifier currentPlayerId
  if (gameState.turnState.currentPlayerId) {
    const playerExists = activePlayers.some(p => p.id === gameState.turnState.currentPlayerId);
    if (!playerExists) {
      errors.push('Le joueur actuel n\'existe pas ou n\'est pas actif');
    }
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

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const DEFAULT_TURN_TIMER_SECONDS = 60;
export const GAME_CODE_LENGTH = 6;
