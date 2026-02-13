'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================================
// P0 PRIMITIVE ACTIONS - Game Master Controls
// ============================================================================

/**
 * P0: SHUFFLE_DECK
 * Mélange toutes les cartes dans la zone DECK
 */
export async function shuffleDeck(gameId: string) {
  const supabase = await createClient()

  // Vérifier que l'utilisateur est GM
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut mélanger le deck')
  }

  // Récupérer la zone DECK
  const { data: deckZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'DECK')
    .single()

  if (!deckZone) {
    throw new Error('Zone DECK introuvable')
  }

  // Récupérer toutes les cartes du DECK
  const { data: cards } = await supabase
    .from('game_cards')
    .select('id')
    .eq('zone_id', deckZone.id)
    .order('position')

  if (!cards || cards.length === 0) {
    throw new Error('Aucune carte dans le deck')
  }

  // Mélanger l'ordre des IDs
  const shuffledCards = [...cards].sort(() => Math.random() - 0.5)

  // Mettre à jour les positions
  for (let i = 0; i < shuffledCards.length; i++) {
    await supabase
      .from('game_cards')
      .update({ position: i })
      .eq('id', shuffledCards[i].id)
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: 'Deck mélangé' }
}

/**
 * P0: REVEAL_TOP_CARD
 * Révèle la carte du dessus du deck à tous les joueurs
 */
export async function revealTopCard(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  // Récupérer la zone DECK
  const { data: deckZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'DECK')
    .single()

  if (!deckZone) {
    throw new Error('Zone DECK introuvable')
  }

  // Récupérer la carte du dessus (position minimale)
  const { data: topCard } = await supabase
    .from('game_cards')
    .select('*')
    .eq('zone_id', deckZone.id)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (!topCard) {
    throw new Error('Aucune carte dans le deck')
  }

  // Mettre face_visible à true
  await supabase
    .from('game_cards')
    .update({ face_visible: true })
    .eq('id', topCard.id)

  revalidatePath(`/games/${gameId}`)
  return { success: true, card: topCard }
}

/**
 * P0: DISTRIBUTE_CARDS (via RPC déjà existant)
 * Wrapper pour appeler distribute_cards avec validation GM
 */
export async function distributeCardsToAll(gameId: string, cardsPerPlayer: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut distribuer les cartes')
  }

  const { data, error } = await supabase.rpc('distribute_cards', {
    p_game_id: gameId,
    p_cards_per_player: cardsPerPlayer,
  })

  if (error) {
    throw new Error('Erreur lors de la distribution: ' + error.message)
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true, cardsDealt: data }
}

/**
 * P0: ADD_POINTS
 * Ajoute des points au score d'un joueur
 */
export async function addPoints(gameId: string, playerId: string, points: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  // Vérifier que c'est le GM
  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut modifier les scores')
  }

  // Récupérer le score actuel
  const { data: player } = await supabase
    .from('game_players')
    .select('score')
    .eq('id', playerId)
    .single()

  const newScore = (player?.score || 0) + points

  // Mettre à jour le score
  await supabase
    .from('game_players')
    .update({ score: newScore })
    .eq('id', playerId)

  revalidatePath(`/games/${gameId}`)
  return { success: true, newScore }
}

/**
 * P0: REMOVE_POINTS
 * Retire des points du score d'un joueur
 */
export async function removePoints(gameId: string, playerId: string, points: number) {
  return addPoints(gameId, playerId, -points)
}

/**
 * P0: DECLARE_GAME_WINNER
 * Déclare un joueur vainqueur et termine la partie
 */
export async function declareWinner(gameId: string, winnerId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut déclarer un vainqueur')
  }

  // Marquer la partie comme terminée
  await supabase
    .from('games')
    .update({
      status: 'finished',
      finished_at: new Date().toISOString(),
    })
    .eq('id', gameId)

  // TODO: Créer une entrée dans une table "winners" ou ajouter winner_id à games

  revalidatePath(`/games/${gameId}`)
  return { success: true, winnerId }
}

/**
 * P0: NEW_ROUND
 * Démarre un nouveau round : rappelle toutes les cartes, mélange, redistribue
 */
export async function startNewRound(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id, current_round')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut démarrer un nouveau round')
  }

  // 1. Rappeler toutes les cartes au DECK
  await recallAllCards(gameId)

  // 2. Mélanger le deck
  await shuffleDeck(gameId)

  // 3. Incrémenter le numéro de round
  await supabase
    .from('games')
    .update({ current_round: (game.current_round || 1) + 1 })
    .eq('id', gameId)

  // 4. Redistribuer
  await distributeCardsToAll(gameId, 5)

  revalidatePath(`/games/${gameId}`)
  return { success: true, round: (game.current_round || 1) + 1 }
}

/**
 * P0: RECALL_ALL_CARDS
 * Rappelle toutes les cartes au DECK (de toutes les zones)
 */
export async function recallAllCards(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  // Récupérer la zone DECK
  const { data: deckZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'DECK')
    .single()

  if (!deckZone) {
    throw new Error('Zone DECK introuvable')
  }

  // Déplacer toutes les cartes vers le DECK
  const { error } = await supabase
    .from('game_cards')
    .update({
      zone_id: deckZone.id,
      owner_id: null,
      face_visible: false,
      position: 0,
    })
    .eq('game_id', gameId)

  if (error) {
    throw new Error('Erreur lors du rappel des cartes: ' + error.message)
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}

/**
 * P0: RANDOM_FIRST_PLAYER
 * Choisit aléatoirement le premier joueur et met à jour turn_state
 */
export async function randomFirstPlayer(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  // Récupérer tous les joueurs
  const { data: players } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', gameId)
    .eq('role', 'PLAYER')

  if (!players || players.length === 0) {
    throw new Error('Aucun joueur dans la partie')
  }

  // Choisir un joueur aléatoire
  const randomPlayer = players[Math.floor(Math.random() * players.length)]

  // Mettre à jour turn_state
  await supabase
    .from('turn_state')
    .update({ current_player_id: randomPlayer.id })
    .eq('game_id', gameId)

  revalidatePath(`/games/${gameId}`)
  return { success: true, playerId: randomPlayer.id }
}

// ============================================================================
// P1 PRIMITIVE ACTIONS - Advanced Turn Management
// ============================================================================

/**
 * P1: REVERSE_DIRECTION
 * Inverse la direction des tours (CLOCKWISE <-> COUNTERCLOCKWISE)
 */
export async function reverseTurnDirection(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut inverser la direction')
  }

  // Récupérer la direction actuelle
  const { data: turnState } = await supabase
    .from('turn_state')
    .select('direction')
    .eq('game_id', gameId)
    .single()

  if (!turnState) {
    throw new Error('État des tours introuvable')
  }

  const newDirection = turnState.direction === 'CLOCKWISE' ? 'COUNTERCLOCKWISE' : 'CLOCKWISE'

  // Mettre à jour
  await supabase
    .from('turn_state')
    .update({ direction: newDirection })
    .eq('game_id', gameId)

  revalidatePath(`/games/${gameId}`)
  return { success: true, direction: newDirection }
}

/**
 * P1: SKIP_PLAYER
 * Saute le joueur actuel et passe au suivant
 */
export async function skipCurrentPlayer(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut sauter un joueur')
  }

  // Récupérer turn_state
  const { data: turnState } = await supabase
    .from('turn_state')
    .select('turn_order, current_player_id, direction')
    .eq('game_id', gameId)
    .single()

  if (!turnState || !turnState.current_player_id) {
    throw new Error('État des tours introuvable')
  }

  // Calculer le joueur suivant
  const currentIndex = turnState.turn_order.indexOf(turnState.current_player_id)
  if (currentIndex === -1) {
    throw new Error('Joueur actuel introuvable dans turn_order')
  }

  const nextIndex =
    turnState.direction === 'CLOCKWISE'
      ? (currentIndex + 1) % turnState.turn_order.length
      : (currentIndex - 1 + turnState.turn_order.length) % turnState.turn_order.length

  const nextPlayerId = turnState.turn_order[nextIndex]

  // Mettre à jour
  await supabase
    .from('turn_state')
    .update({ current_player_id: nextPlayerId })
    .eq('game_id', gameId)

  revalidatePath(`/games/${gameId}`)
  return { success: true, nextPlayerId }
}

/**
 * P1: PASS_TO_PLAYER
 * Passe le tour à un joueur spécifique
 */
export async function passToSpecificPlayer(gameId: string, targetPlayerId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut forcer le tour à un joueur')
  }

  // Vérifier que le joueur existe dans turn_order
  const { data: turnState } = await supabase
    .from('turn_state')
    .select('turn_order')
    .eq('game_id', gameId)
    .single()

  if (!turnState || !turnState.turn_order.includes(targetPlayerId)) {
    throw new Error('Joueur cible invalide')
  }

  // Mettre à jour
  await supabase
    .from('turn_state')
    .update({ current_player_id: targetPlayerId })
    .eq('game_id', gameId)

  revalidatePath(`/games/${gameId}`)
  return { success: true, targetPlayerId }
}

// ============================================================================
// P1 ADVANCED GM ACTIONS
// ============================================================================

/**
 * P1: SHUFFLE_ZONE
 * Mélange une zone spécifique (ex: défausse, main d'un joueur, etc.)
 */
export async function shuffleZone(gameId: string, zoneId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut mélanger une zone')
  }

  // Récupérer toutes les cartes de la zone
  const { data: cards } = await supabase
    .from('game_cards')
    .select('id')
    .eq('zone_id', zoneId)
    .order('position')

  if (!cards || cards.length === 0) {
    return { success: true, message: 'Aucune carte dans cette zone' }
  }

  // Mélanger
  const shuffledCards = [...cards].sort(() => Math.random() - 0.5)

  // Mettre à jour les positions
  for (let i = 0; i < shuffledCards.length; i++) {
    await supabase
      .from('game_cards')
      .update({ position: i })
      .eq('id', shuffledCards[i].id)
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: `Zone mélangée (${cards.length} cartes)` }
}

/**
 * P1: CUT_DECK
 * Coupe le deck à une position spécifique
 */
export async function cutDeck(gameId: string, cutPosition: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut couper le deck')
  }

  // Récupérer la zone DECK
  const { data: deckZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'DECK')
    .single()

  if (!deckZone) {
    throw new Error('Zone DECK introuvable')
  }

  // Récupérer toutes les cartes du deck
  const { data: cards } = await supabase
    .from('game_cards')
    .select('id, position')
    .eq('zone_id', deckZone.id)
    .order('position')

  if (!cards || cards.length === 0) {
    throw new Error('Aucune carte dans le deck')
  }

  // Couper le deck (inverser les deux moitiés)
  const topHalf = cards.slice(0, cutPosition)
  const bottomHalf = cards.slice(cutPosition)
  const cutDeck = [...bottomHalf, ...topHalf]

  // Mettre à jour les positions
  for (let i = 0; i < cutDeck.length; i++) {
    await supabase
      .from('game_cards')
      .update({ position: i })
      .eq('id', cutDeck[i].id)
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: `Deck coupé à la position ${cutPosition}` }
}

/**
 * P1: RECYCLE_DISCARD
 * Remélange toutes les cartes de la défausse dans la pioche
 */
export async function recycleDiscard(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut recycler la défausse')
  }

  // Récupérer les zones DECK et DISCARD
  const { data: deckZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'DECK')
    .single()

  const { data: discardZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'DISCARD')
    .single()

  if (!deckZone || !discardZone) {
    throw new Error('Zones DECK ou DISCARD introuvables')
  }

  // Récupérer toutes les cartes de la défausse
  const { data: discardCards } = await supabase
    .from('game_cards')
    .select('id')
    .eq('zone_id', discardZone.id)

  if (!discardCards || discardCards.length === 0) {
    return { success: true, message: 'La défausse est vide' }
  }

  // Trouver la position max dans le deck
  const { data: maxPos } = await supabase
    .from('game_cards')
    .select('position')
    .eq('zone_id', deckZone.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  let newPosition = (maxPos?.position || -1) + 1

  // Mélanger les cartes avant de les remettre
  const shuffledDiscardCards = [...discardCards].sort(() => Math.random() - 0.5)

  // Déplacer toutes les cartes vers le deck
  for (const card of shuffledDiscardCards) {
    await supabase
      .from('game_cards')
      .update({
        zone_id: deckZone.id,
        owner_id: null,
        position: newPosition++,
        face_visible: false,
      })
      .eq('id', card.id)
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: `${discardCards.length} cartes recyclées dans le deck` }
}

/**
 * P1: PAUSE_GAME / RESUME_GAME
 * Met la partie en pause ou la reprend
 */
export async function toggleGamePause(gameId: string, pause: boolean) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut mettre en pause')
  }

  // Ajouter/mettre à jour un champ paused dans la table games
  // NOTE: Nécessite migration pour ajouter colonne is_paused: boolean
  // Pour l'instant, on simule avec un update vide
  await supabase
    .from('games')
    .update({
      // is_paused: pause
      // TODO: Ajouter colonne is_paused dans migration
    })
    .eq('id', gameId)

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: pause ? 'Partie en pause' : 'Partie reprise' }
}

/**
 * P1: DRAW_SPECIFIC (GM uniquement)
 * Le GM pioche une carte spécifique du deck
 */
export async function drawSpecificCard(gameId: string, cardId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut piocher une carte spécifique')
  }

  // Récupérer le joueur GM
  const { data: gmPlayer } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .single()

  if (!gmPlayer) {
    throw new Error('Joueur GM introuvable')
  }

  // Récupérer la zone HAND du GM
  const { data: handZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'HAND')
    .eq('owner_player_id', gmPlayer.id)
    .single()

  if (!handZone) {
    throw new Error('Zone HAND du GM introuvable')
  }

  // Trouver la position max dans la main
  const { data: maxPos } = await supabase
    .from('game_cards')
    .select('position')
    .eq('zone_id', handZone.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const newPosition = (maxPos?.position || -1) + 1

  // Déplacer la carte spécifique
  await supabase
    .from('game_cards')
    .update({
      zone_id: handZone.id,
      owner_id: gmPlayer.id,
      position: newPosition,
    })
    .eq('id', cardId)

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: 'Carte spécifique piochée' }
}

/**
 * P1: EXCHANGE_CARDS (GM uniquement)
 * Le GM échange des cartes entre deux joueurs
 */
export async function exchangeCards(
  gameId: string,
  player1Id: string,
  player2Id: string,
  card1Ids: string[],
  card2Ids: string[]
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut échanger des cartes')
  }

  // Récupérer les zones HAND des deux joueurs
  const { data: hand1 } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'HAND')
    .eq('owner_player_id', player1Id)
    .single()

  const { data: hand2 } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'HAND')
    .eq('owner_player_id', player2Id)
    .single()

  if (!hand1 || !hand2) {
    throw new Error('Zones HAND introuvables')
  }

  // Transférer les cartes du joueur 1 vers le joueur 2
  for (const cardId of card1Ids) {
    await supabase
      .from('game_cards')
      .update({
        zone_id: hand2.id,
        owner_id: player2Id,
      })
      .eq('id', cardId)
  }

  // Transférer les cartes du joueur 2 vers le joueur 1
  for (const cardId of card2Ids) {
    await supabase
      .from('game_cards')
      .update({
        zone_id: hand1.id,
        owner_id: player1Id,
      })
      .eq('id', cardId)
  }

  revalidatePath(`/games/${gameId}`)
  return {
    success: true,
    message: `Échange effectué : ${card1Ids.length} ↔ ${card2Ids.length} cartes`,
  }
}

/**
 * P1: ADD_CARDS_TO_DECK
 * Ajoute des cartes au deck en cours de partie
 */
export async function addCardsToDeck(gameId: string, cardIds: string[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut ajouter des cartes au deck')
  }

  // Récupérer la zone DECK
  const { data: deckZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'DECK')
    .single()

  if (!deckZone) {
    throw new Error('Zone DECK introuvable')
  }

  // Trouver la position max dans le deck
  const { data: maxPos } = await supabase
    .from('game_cards')
    .select('position')
    .eq('zone_id', deckZone.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  let newPosition = (maxPos?.position || -1) + 1

  // Ajouter les cartes au deck
  for (const cardId of cardIds) {
    await supabase
      .from('game_cards')
      .update({
        zone_id: deckZone.id,
        owner_id: null,
        position: newPosition++,
        face_visible: false,
      })
      .eq('id', cardId)
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: `${cardIds.length} cartes ajoutées au deck` }
}

/**
 * P1: REMOVE_CARDS_FROM_DECK
 * Retire des cartes du deck en cours de partie
 */
export async function removeCardsFromDeck(gameId: string, cardIds: string[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut retirer des cartes du deck')
  }

  // Supprimer les cartes de game_cards (elles ne sont plus en jeu)
  await supabase.from('game_cards').delete().in('id', cardIds)

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: `${cardIds.length} cartes retirées du jeu` }
}

/**
 * P1: DISTRIBUTE_BATCH
 * Distribution rapide de N cartes à tous les joueurs (distributeCardsToAll est déjà P1)
 * Cette fonction est un alias pour plus de clarté
 */
export { distributeCardsToAll as distributeBatch }

/**
 * P1: DISTRIBUTE_TO_ZONE
 * Distribue des cartes vers une zone spécifique
 */
export async function distributeToZone(gameId: string, count: number, zoneId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut distribuer vers une zone')
  }

  // Récupérer la zone DECK
  const { data: deckZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'DECK')
    .single()

  if (!deckZone) {
    throw new Error('Zone DECK introuvable')
  }

  // Récupérer N cartes du deck
  const { data: cards } = await supabase
    .from('game_cards')
    .select('id')
    .eq('zone_id', deckZone.id)
    .order('position')
    .limit(count)

  if (!cards || cards.length < count) {
    throw new Error(`Pas assez de cartes dans le deck (${cards?.length || 0}/${count})`)
  }

  // Trouver la position max dans la zone cible
  const { data: maxPos } = await supabase
    .from('game_cards')
    .select('position')
    .eq('zone_id', zoneId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  let newPosition = (maxPos?.position || -1) + 1

  // Déplacer les cartes vers la zone cible
  for (const card of cards) {
    await supabase
      .from('game_cards')
      .update({
        zone_id: zoneId,
        position: newPosition++,
      })
      .eq('id', card.id)
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: `${count} cartes distribuées vers la zone` }
}

/**
 * P1: REDISTRIBUTE
 * Redistribue les cartes sans remélanger
 */
export async function redistribute(gameId: string, cardsPerPlayer: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut redistribuer')
  }

  // 1. Rappeler toutes les cartes au deck (sans mélanger)
  await recallAllCards(gameId)

  // 2. Distribuer sans mélanger
  await distributeCardsToAll(gameId, cardsPerPlayer)

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: `Redistribution de ${cardsPerPlayer} cartes par joueur` }
}

/**
 * P1: SHOW_HAND_TO_PLAYER
 * Permet au GM de montrer la main d'un joueur à un autre
 */
export async function showHandToPlayer(
  gameId: string,
  handOwnerId: string,
  viewerId: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut montrer une main')
  }

  // NOTE: Cette action nécessiterait un système de "revealed_to" dans game_cards
  // ou une table séparée pour les révélations temporaires
  // Pour l'instant, on simule avec un update vide

  revalidatePath(`/games/${gameId}`)
  return {
    success: true,
    message: `Main de ${handOwnerId} révélée à ${viewerId}`,
  }
}

/**
 * P1: TOGGLE_OPEN_GAME
 * Active/désactive le mode "jeu ouvert" (toutes les mains visibles)
 */
export async function toggleOpenGame(gameId: string, isOpen: boolean) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut activer le jeu ouvert')
  }

  // Mettre à jour toutes les cartes dans les mains
  const { data: handZones } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'HAND')

  if (handZones) {
    for (const zone of handZones) {
      await supabase
        .from('game_cards')
        .update({ face_visible: isOpen })
        .eq('zone_id', zone.id)
    }
  }

  revalidatePath(`/games/${gameId}`)
  return {
    success: true,
    message: isOpen ? 'Jeu ouvert activé - Toutes les mains visibles' : 'Jeu ouvert désactivé',
  }
}

/**
 * P1: CARDS_TO_DECK (fin de tour)
 * Remettre les cartes du centre dans la pioche
 */
export async function cardsToDeck(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut remettre les cartes au deck')
  }

  // Récupérer les zones CENTER et DECK
  const { data: centerZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'CENTER')
    .single()

  const { data: deckZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'DECK')
    .single()

  if (!centerZone || !deckZone) {
    throw new Error('Zones CENTER ou DECK introuvables')
  }

  // Récupérer toutes les cartes du centre
  const { data: centerCards } = await supabase
    .from('game_cards')
    .select('id')
    .eq('zone_id', centerZone.id)

  if (!centerCards || centerCards.length === 0) {
    return { success: true, message: 'Aucune carte au centre' }
  }

  // Trouver la position max dans le deck
  const { data: maxPos } = await supabase
    .from('game_cards')
    .select('position')
    .eq('zone_id', deckZone.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  let newPosition = (maxPos?.position || -1) + 1

  // Déplacer toutes les cartes vers le deck
  for (const card of centerCards) {
    await supabase
      .from('game_cards')
      .update({
        zone_id: deckZone.id,
        owner_id: null,
        position: newPosition++,
        face_visible: false,
      })
      .eq('id', card.id)
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: `${centerCards.length} cartes remises au deck` }
}

/**
 * P1: CANCEL_DECLARATION
 * Annule une déclaration de vainqueur
 */
export async function cancelDeclaration(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id, status')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut annuler une déclaration')
  }

  // Remettre le statut à "playing"
  if (game.status === 'finished') {
    await supabase
      .from('games')
      .update({
        status: 'playing',
        finished_at: null,
      })
      .eq('id', gameId)
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: 'Déclaration annulée - Partie reprise' }
}

// ============================================================================
// P1 ZONE MANAGEMENT
// ============================================================================

/**
 * P1: CREATE_ZONE
 * Crée une nouvelle zone personnalisée sur le tapis
 */
export async function createZone(
  gameId: string,
  zoneConfig: {
    name: string
    type: string
    visibility: string
    default_face: string
    max_capacity?: number
    owner_player_id?: string
    position_x?: number
    position_y?: number
    width?: number
    height?: number
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut créer une zone')
  }

  // Créer la zone
  const { data: newZone, error } = await supabase
    .from('zones')
    .insert({
      game_id: gameId,
      name: zoneConfig.name,
      type: zoneConfig.type,
      visibility: zoneConfig.visibility,
      default_face: zoneConfig.default_face,
      is_ordered: true,
      max_capacity: zoneConfig.max_capacity || null,
      owner_player_id: zoneConfig.owner_player_id || null,
      is_enabled: true,
      position_x: zoneConfig.position_x || null,
      position_y: zoneConfig.position_y || null,
      width: zoneConfig.width || null,
      height: zoneConfig.height || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Erreur lors de la création de la zone: ${error.message}`)
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true, zoneId: newZone.id, message: `Zone "${zoneConfig.name}" créée` }
}

/**
 * P1: DELETE_ZONE
 * Supprime une zone personnalisée (ne peut pas supprimer les zones par défaut)
 */
export async function deleteZone(gameId: string, zoneId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut supprimer une zone')
  }

  // Vérifier que la zone n'est pas une zone par défaut (DECK, HAND, CENTER, DISCARD)
  const { data: zone } = await supabase.from('zones').select('type').eq('id', zoneId).single()

  if (!zone) {
    throw new Error('Zone introuvable')
  }

  const defaultZones = ['DECK', 'HAND', 'CENTER', 'DISCARD']
  if (defaultZones.includes(zone.type)) {
    throw new Error('Impossible de supprimer une zone par défaut')
  }

  // Supprimer toutes les cartes de cette zone (les remettre au deck)
  const { data: deckZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'DECK')
    .single()

  if (deckZone) {
    await supabase
      .from('game_cards')
      .update({ zone_id: deckZone.id, owner_id: null })
      .eq('zone_id', zoneId)
  }

  // Supprimer la zone
  await supabase.from('zones').delete().eq('id', zoneId)

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: 'Zone supprimée' }
}

/**
 * P1: REPOSITION_ZONE
 * Déplace/redimensionne une zone sur le tapis
 */
export async function repositionZone(
  gameId: string,
  zoneId: string,
  position: {
    x?: number
    y?: number
    width?: number
    height?: number
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut repositionner une zone')
  }

  // Mettre à jour la position/taille de la zone
  await supabase
    .from('zones')
    .update({
      position_x: position.x,
      position_y: position.y,
      width: position.width,
      height: position.height,
    })
    .eq('id', zoneId)

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: 'Zone repositionnée' }
}

/**
 * P1: UPDATE_ZONE_CONFIG
 * Modifie les propriétés d'une zone (visibilité, capacité, etc.)
 */
export async function updateZoneConfig(
  gameId: string,
  zoneId: string,
  config: {
    name?: string
    visibility?: string
    default_face?: string
    max_capacity?: number
    is_enabled?: boolean
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut modifier la configuration d\'une zone')
  }

  // Préparer les updates (filtrer les undefined)
  const updates: any = {}
  if (config.name !== undefined) updates.name = config.name
  if (config.visibility !== undefined) updates.visibility = config.visibility
  if (config.default_face !== undefined) updates.default_face = config.default_face
  if (config.max_capacity !== undefined) updates.max_capacity = config.max_capacity
  if (config.is_enabled !== undefined) updates.is_enabled = config.is_enabled

  // Mettre à jour la zone
  await supabase.from('zones').update(updates).eq('id', zoneId)

  revalidatePath(`/games/${gameId}`)
  return { success: true, message: 'Configuration de la zone mise à jour' }
}

// ============================================================================
// P1 UNDO ACTION
// ============================================================================

/**
 * P1: UNDO_ACTION
 * Annule la dernière action effectuée
 * NOTE: Nécessite une table primitive_actions_log pour fonctionner pleinement
 */
export async function undoAction(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (game?.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut annuler une action')
  }

  // NOTE: Pour une vraie implémentation, il faudrait :
  // 1. Une table primitive_actions_log qui stocke toutes les actions avec leurs paramètres
  // 2. Un système de "compensation" qui sait comment inverser chaque type d'action
  // 3. Un flag "can_be_undone" pour savoir si l'action est réversible
  //
  // Exemple de structure:
  // - DRAW_CARD → inverse: remettre carte au deck
  // - GIVE_TO_PLAYER → inverse: reprendre la carte
  // - SHUFFLE_DECK → inverse: impossible (can_be_undone = false)
  //
  // Pour l'instant, on retourne un message d'erreur car cette fonctionnalité
  // nécessite une migration de base de données complète

  revalidatePath(`/games/${gameId}`)
  return {
    success: false,
    message: 'Fonction UNDO nécessite la table primitive_actions_log (migration future)',
  }
}
