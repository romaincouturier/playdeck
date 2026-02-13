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
