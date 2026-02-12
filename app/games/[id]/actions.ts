'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fetchGameState } from '@/lib/game/state-utils'
import { GameEngine } from '@/lib/game/engine'

export async function drawCard(gameId: string, guestSessionId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const playerId = user?.id || guestSessionId

  if (!playerId) {
    throw new Error('Identification requise')
  }

  // 1. Fetch current game state
  const state = await fetchGameState(gameId)
  const engine = new GameEngine(state.deck_config)

  // 2. Validate action
  const validation = engine.validateAction(state, {
    type: 'DRAW_CARDS',
    playerId
  })

  if (!validation.valid) {
    throw new Error(validation.error || 'Action invalide')
  }

  // 3. Execute action logic (find the card to draw)
  const deckZone = state.deck_config.zones.find(z => z.type === 'DECK')
  const handZone = state.deck_config.zones.find(z => z.type === 'HAND') // v2: scope removed, zones have owner_player_id instead

  if (!deckZone || !handZone) {
    throw new Error('Configuration du deck invalide (zones manquantes)')
  }

  const cardToDraw = state.cards
    .filter(c => c.zone_id === deckZone.id)
    .sort((a, b) => a.position - b.position)[0]

  if (!cardToDraw) {
    throw new Error('La pioche est vide')
  }

  // 4. Update database
  const myCardsInHand = state.cards.filter(c => c.zone_id === handZone.id && c.owner_id === playerId)
  const newPosition = myCardsInHand.length > 0
    ? Math.max(...myCardsInHand.map(c => c.position)) + 1
    : 0

  const updateData: any = {
    zone_id: handZone.id,
    position: newPosition,
  }

  if (user) {
    updateData.owner_user_id = user.id
  } else {
    updateData.owner_guest_session_id = guestSessionId
  }

  const { error } = await supabase
    .from('game_cards')
    .update(updateData)
    .eq('id', cardToDraw.id)

  if (error) {
    throw new Error('Erreur lors du tirage de la carte')
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}

export async function playCard(gameId: string, cardId: string, guestSessionId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const playerId = user?.id || guestSessionId

  if (!playerId) {
    throw new Error('Identification requise')
  }

  // 1. Fetch current game state
  const state = await fetchGameState(gameId)
  const engine = new GameEngine(state.deck_config)

  // 2. Validate action
  const validation = engine.validateAction(state, {
    type: 'PLAY_CARD',
    playerId,
    payload: { cardId }
  })

  if (!validation.valid) {
    throw new Error(validation.error || 'Action invalide')
  }

  // 3. Execute action logic (find the target zone - usually DISCARD or PLAY_AREA)
  const discardZone = state.deck_config.zones.find(z => z.type === 'DISCARD' || z.type === 'PLAY_AREA')
  if (!discardZone) {
    throw new Error('Configuration du deck invalide (zone de défausse manquante)')
  }

  const cardsInDiscard = state.cards.filter(c => c.zone_id === discardZone.id)
  const newPosition = cardsInDiscard.length > 0
    ? Math.max(...cardsInDiscard.map(c => c.position)) + 1
    : 0

  // 4. Update database
  const { error } = await supabase
    .from('game_cards')
    .update({
      zone_id: discardZone.id,
      owner_user_id: null,
      owner_guest_session_id: null,
      position: newPosition,
    })
    .eq('id', cardId)

  if (error) {
    throw new Error('Erreur lors du jeu de la carte')
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}

export async function passTurn(gameId: string, guestSessionId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const playerId = user?.id || guestSessionId

  if (!playerId) {
    throw new Error('Identification requise')
  }

  // 1. Fetch current game state
  const state = await fetchGameState(gameId)
  const engine = new GameEngine(state.deck_config)

  // 2. Validate action
  const validation = engine.validateAction(state, {
    type: 'PASS_TURN',
    playerId
  })

  if (!validation.valid) {
    throw new Error(validation.error || 'Action invalide')
  }

  // 3. v2: Get turn_state to find next player
  const { data: turnState, error: turnStateError } = await supabase
    .from('turn_state')
    .select('turn_order, current_player_id, direction')
    .eq('game_id', gameId)
    .single()

  if (turnStateError || !turnState) {
    throw new Error('État du tour introuvable')
  }

  // 4. v2: Find current player in turn_order
  const { data: currentGamePlayer } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', gameId)
    .or(user ? `user_id.eq.${user.id}` : `guest_session_id.eq.${guestSessionId}`)
    .single()

  if (!currentGamePlayer) {
    throw new Error('Joueur introuvable')
  }

  // 5. v2: Find next player in turn_order
  const currentIndex = turnState.turn_order.indexOf(currentGamePlayer.id)
  if (currentIndex === -1) {
    throw new Error('Joueur non présent dans l\'ordre des tours')
  }

  const nextIndex = turnState.direction === 'CLOCKWISE'
    ? (currentIndex + 1) % turnState.turn_order.length
    : (currentIndex - 1 + turnState.turn_order.length) % turnState.turn_order.length

  const nextPlayerId = turnState.turn_order[nextIndex]

  // 6. v2: Update turn_state
  const { error } = await supabase
    .from('turn_state')
    .update({
      current_player_id: nextPlayerId,
      updated_at: new Date().toISOString(),
    })
    .eq('game_id', gameId)

  if (error) {
    throw new Error('Erreur lors du passage du tour')
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}

export async function endGame(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  // v2: Vérifier que l'utilisateur est le Game Master
  const { data: game } = await supabase
    .from('games')
    .select('game_master_id, status')
    .eq('id', gameId)
    .single()

  if (!game || game.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut terminer la partie')
  }

  // Mettre à jour le statut de la partie
  const { error } = await supabase
    .from('games')
    .update({
      status: 'finished',
      finished_at: new Date().toISOString(),
    })
    .eq('id', gameId)

  if (error) {
    throw new Error('Erreur lors de la fin de la partie')
  }

  // On ne revalide pas car on quitte la page de toute façon
  return { success: true }
}

export async function revealAll(gameId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Identification requise')
  }

  // 1. Fetch current game state
  const state = await fetchGameState(gameId)

  // 2. v2: Check if Game Master
  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', gameId)
    .single()

  if (!game || game.game_master_id !== user.id) {
    throw new Error('Seul le Game Master peut révéler les votes')
  }

  // 3. v2: Phase management removed - this action may need to be reimplemented
  // depending on how phases are now managed in v2 (possibly through turn_state or game state)
  // For now, we'll just revalidate the path to trigger a UI update
  // TODO: Implement proper phase management for v2 if needed

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}
