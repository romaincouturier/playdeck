'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getGuestSession } from '@/lib/guest-session'

// ============================================================================
// P1 PRIMITIVE ACTIONS - Player Advanced Actions
// ============================================================================

/**
 * P1: RETURN_TO_DECK
 * Retourne une carte de la main au deck
 */
export async function returnCardToDeck(gameId: string, cardId: string, guestSessionId?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const session = guestSessionId || (await getGuestSession())?.sessionId

  if (!user && !session) {
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

  // Trouver la position maximale dans le deck
  const { data: maxPos } = await supabase
    .from('game_cards')
    .select('position')
    .eq('zone_id', deckZone.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const newPosition = (maxPos?.position || -1) + 1

  // Déplacer la carte
  await supabase
    .from('game_cards')
    .update({
      zone_id: deckZone.id,
      owner_id: null,
      position: newPosition,
      face_visible: false,
    })
    .eq('id', cardId)

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}

/**
 * P1: GIVE_TO_PLAYER
 * Donne une carte à un autre joueur
 */
export async function giveCardToPlayer(
  gameId: string,
  cardId: string,
  targetPlayerId: string,
  guestSessionId?: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const session = guestSessionId || (await getGuestSession())?.sessionId

  if (!user && !session) {
    throw new Error('Non authentifié')
  }

  // Récupérer la zone HAND du joueur cible
  const { data: targetHandZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'HAND')
    .eq('owner_player_id', targetPlayerId)
    .single()

  if (!targetHandZone) {
    throw new Error('Zone HAND du joueur cible introuvable')
  }

  // Trouver la position maximale dans la main du joueur cible
  const { data: maxPos } = await supabase
    .from('game_cards')
    .select('position')
    .eq('zone_id', targetHandZone.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const newPosition = (maxPos?.position || -1) + 1

  // Déplacer la carte
  await supabase
    .from('game_cards')
    .update({
      zone_id: targetHandZone.id,
      owner_id: targetPlayerId,
      position: newPosition,
    })
    .eq('id', cardId)

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}

/**
 * P1: FLIP_CARD
 * Retourne une carte (change face_visible)
 */
export async function flipCard(gameId: string, cardId: string, guestSessionId?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const session = guestSessionId || (await getGuestSession())?.sessionId

  if (!user && !session) {
    throw new Error('Non authentifié')
  }

  // Récupérer l'état actuel
  const { data: card } = await supabase
    .from('game_cards')
    .select('face_visible')
    .eq('id', cardId)
    .single()

  if (!card) {
    throw new Error('Carte introuvable')
  }

  // Inverser face_visible
  await supabase
    .from('game_cards')
    .update({ face_visible: !card.face_visible })
    .eq('id', cardId)

  revalidatePath(`/games/${gameId}`)
  return { success: true, faceVisible: !card.face_visible }
}

/**
 * P1: REVEAL_TO_ALL
 * Révèle une carte à tous les joueurs (face_visible = true)
 */
export async function revealCardToAll(gameId: string, cardId: string, guestSessionId?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const session = guestSessionId || (await getGuestSession())?.sessionId

  if (!user && !session) {
    throw new Error('Non authentifié')
  }

  // Mettre face_visible à true
  await supabase
    .from('game_cards')
    .update({ face_visible: true })
    .eq('id', cardId)

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}

/**
 * P1: DRAW_BOTTOM
 * Piocher la carte du bas du deck
 */
export async function drawBottomCard(gameId: string, guestSessionId?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const session = guestSessionId || (await getGuestSession())?.sessionId
  const playerId = user?.id || session

  if (!playerId) {
    throw new Error('Non authentifié')
  }

  // Récupérer le joueur
  const { data: player } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', gameId)
    .or(`user_id.eq.${user?.id},guest_session_id.eq.${session}`)
    .single()

  if (!player) {
    throw new Error('Joueur introuvable')
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

  // Récupérer la carte du bas (position maximale)
  const { data: bottomCard } = await supabase
    .from('game_cards')
    .select('*')
    .eq('zone_id', deckZone.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  if (!bottomCard) {
    throw new Error('Le deck est vide')
  }

  // Récupérer la zone HAND du joueur
  const { data: handZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'HAND')
    .eq('owner_player_id', player.id)
    .single()

  if (!handZone) {
    throw new Error('Zone HAND introuvable')
  }

  // Trouver la position maximale dans la main
  const { data: maxPos } = await supabase
    .from('game_cards')
    .select('position')
    .eq('zone_id', handZone.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const newPosition = (maxPos?.position || -1) + 1

  // Déplacer la carte
  await supabase
    .from('game_cards')
    .update({
      zone_id: handZone.id,
      owner_id: player.id,
      position: newPosition,
    })
    .eq('id', bottomCard.id)

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}

/**
 * P1: TAKE_FROM_DISCARD
 * Prendre la carte du dessus de la défausse
 */
export async function takeFromDiscard(gameId: string, guestSessionId?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const session = guestSessionId || (await getGuestSession())?.sessionId
  const playerId = user?.id || session

  if (!playerId) {
    throw new Error('Non authentifié')
  }

  // Récupérer le joueur
  const { data: player } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', gameId)
    .or(`user_id.eq.${user?.id},guest_session_id.eq.${session}`)
    .single()

  if (!player) {
    throw new Error('Joueur introuvable')
  }

  // Récupérer la zone DISCARD
  const { data: discardZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'DISCARD')
    .single()

  if (!discardZone) {
    throw new Error('Zone DISCARD introuvable')
  }

  // Récupérer la carte du dessus de la défausse (position maximale)
  const { data: topCard } = await supabase
    .from('game_cards')
    .select('*')
    .eq('zone_id', discardZone.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  if (!topCard) {
    throw new Error('La défausse est vide')
  }

  // Récupérer la zone HAND du joueur
  const { data: handZone } = await supabase
    .from('zones')
    .select('id')
    .eq('game_id', gameId)
    .eq('type', 'HAND')
    .eq('owner_player_id', player.id)
    .single()

  if (!handZone) {
    throw new Error('Zone HAND introuvable')
  }

  // Trouver la position maximale dans la main
  const { data: maxPos } = await supabase
    .from('game_cards')
    .select('position')
    .eq('zone_id', handZone.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const newPosition = (maxPos?.position || -1) + 1

  // Déplacer la carte
  await supabase
    .from('game_cards')
    .update({
      zone_id: handZone.id,
      owner_id: player.id,
      position: newPosition,
    })
    .eq('id', topCard.id)

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}
