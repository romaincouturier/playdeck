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
  const handZone = state.deck_config.zones.find(z => z.type === 'HAND' && z.scope === 'PLAYER')

  if (!deckZone || !handZone) {
    throw new Error('Configuration du deck invalide (zones manquantes)')
  }

  const cardToDraw = state.cards
    .filter(c => c.location === deckZone.id)
    .sort((a, b) => a.position - b.position)[0]

  if (!cardToDraw) {
    throw new Error('La pioche est vide')
  }

  // 4. Update database
  const myCardsInHand = state.cards.filter(c => c.location === handZone.id && c.owner_id === playerId)
  const newPosition = myCardsInHand.length > 0
    ? Math.max(...myCardsInHand.map(c => c.position)) + 1
    : 0

  const updateData: any = {
    location: handZone.id,
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

  const cardsInDiscard = state.cards.filter(c => c.location === discardZone.id)
  const newPosition = cardsInDiscard.length > 0
    ? Math.max(...cardsInDiscard.map(c => c.position)) + 1
    : 0

  // 4. Update database
  const { error } = await supabase
    .from('game_cards')
    .update({
      location: discardZone.id,
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

  // 3. Find next player in order
  const { players } = state
  const currentPlayerIndex = players.findIndex((p) => (p.user_id || p.guest_session_id) === playerId)

  let nextPlayerIndex = (currentPlayerIndex + 1) % players.length
  // Skip inactive players
  let attempts = 0
  while (!players[nextPlayerIndex].is_active && attempts < players.length) {
    nextPlayerIndex = (nextPlayerIndex + 1) % players.length
    attempts++
  }

  const nextPlayer = players[nextPlayerIndex]

  // 4. Update the game
  const isNextGuest = !nextPlayer.user_id && !!nextPlayer.guest_session_id;

  const { error } = await supabase
    .from('games')
    .update({
      current_turn_player_id: isNextGuest ? null : nextPlayer.user_id,
      current_turn_guest_id: isNextGuest ? nextPlayer.guest_session_id : null,
    })
    .eq('id', gameId)

  // NOTE: If the current system only supports auth.users in current_turn_player_id, 
  // we might need to update the schema to support guest session IDs too.
  // Checking game-schema.sql: line 13: current_turn_player_id UUID REFERENCES auth.users(id),
  // Yes, it's a FK to auth.users. This needs to be relaxed or a separate column added.

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

  // Vérifier que l'utilisateur est l'hôte
  const { data: game } = await supabase
    .from('games')
    .select('host_id, status')
    .eq('id', gameId)
    .single()

  if (!game || game.host_id !== user.id) {
    throw new Error('Seul l\'hôte peut terminer la partie')
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

  // 2. Check if host
  const { data: game } = await supabase
    .from('games')
    .select('host_id')
    .eq('id', gameId)
    .single()

  if (!game || game.host_id !== user.id) {
    throw new Error('Seul l\'hôte peut révéler les votes')
  }

  // 3. Update phase to reveal
  const { error } = await supabase
    .from('games')
    .update({
      current_phase_id: 'reveal'
    })
    .eq('id', gameId)

  if (error) {
    throw new Error('Erreur lors de la révélation des votes')
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}
