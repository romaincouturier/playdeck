'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function drawCard(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  // Vérifier que c'est le tour du joueur
  const { data: game } = await supabase
    .from('games')
    .select('current_turn_player_id, status')
    .eq('id', gameId)
    .single()

  if (!game || game.status !== 'playing') {
    throw new Error('Partie introuvable ou terminée')
  }

  if (game.current_turn_player_id !== user.id) {
    throw new Error('Ce n\'est pas votre tour')
  }

  // Récupérer la première carte de la pioche
  const { data: deckCards } = await supabase
    .from('game_cards')
    .select('id, position')
    .eq('game_id', gameId)
    .eq('location', 'deck')
    .order('position')
    .limit(1)

  if (!deckCards || deckCards.length === 0) {
    throw new Error('La pioche est vide')
  }

  const card = deckCards[0]

  // Compter les cartes dans la main du joueur
  const { data: handCards } = await supabase
    .from('game_cards')
    .select('position')
    .eq('game_id', gameId)
    .eq('location', 'hand')
    .eq('owner_user_id', user.id)
    .order('position', { ascending: false })
    .limit(1)

  const newPosition = handCards && handCards.length > 0 ? handCards[0].position + 1 : 0

  // Déplacer la carte vers la main du joueur
  const { error } = await supabase
    .from('game_cards')
    .update({
      location: 'hand',
      owner_user_id: user.id,
      position: newPosition,
    })
    .eq('id', card.id)

  if (error) {
    throw new Error('Erreur lors du tirage de la carte')
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}

export async function playCard(gameId: string, cardId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  // Vérifier que c'est le tour du joueur
  const { data: game } = await supabase
    .from('games')
    .select('current_turn_player_id, status')
    .eq('id', gameId)
    .single()

  if (!game || game.status !== 'playing') {
    throw new Error('Partie introuvable ou terminée')
  }

  if (game.current_turn_player_id !== user.id) {
    throw new Error('Ce n\'est pas votre tour')
  }

  // Vérifier que la carte appartient au joueur
  const { data: card } = await supabase
    .from('game_cards')
    .select('id, location, owner_user_id')
    .eq('id', cardId)
    .eq('game_id', gameId)
    .single()

  if (!card || card.location !== 'hand' || card.owner_user_id !== user.id) {
    throw new Error('Carte introuvable dans votre main')
  }

  // Compter les cartes dans la défausse
  const { data: discardCards } = await supabase
    .from('game_cards')
    .select('position')
    .eq('game_id', gameId)
    .eq('location', 'discard')
    .order('position', { ascending: false })
    .limit(1)

  const newPosition = discardCards && discardCards.length > 0 ? discardCards[0].position + 1 : 0

  // Déplacer la carte vers la défausse
  const { error } = await supabase
    .from('game_cards')
    .update({
      location: 'discard',
      owner_user_id: null,
      position: newPosition,
    })
    .eq('id', cardId)

  if (error) {
    throw new Error('Erreur lors du jeu de la carte')
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}

export async function passTurn(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  // Vérifier que c'est le tour du joueur
  const { data: game } = await supabase
    .from('games')
    .select('current_turn_player_id, status')
    .eq('id', gameId)
    .single()

  if (!game || game.status !== 'playing') {
    throw new Error('Partie introuvable ou terminée')
  }

  if (game.current_turn_player_id !== user.id) {
    throw new Error('Ce n\'est pas votre tour')
  }

  // Récupérer tous les joueurs dans l'ordre
  const { data: players } = await supabase
    .from('game_players')
    .select('user_id, player_order')
    .eq('game_id', gameId)
    .order('player_order')

  if (!players || players.length === 0) {
    throw new Error('Aucun joueur trouvé')
  }

  // Trouver le joueur actuel et le joueur suivant
  const currentPlayerIndex = players.findIndex((p) => p.user_id === user.id)
  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length
  const nextPlayer = players[nextPlayerIndex]

  // Mettre à jour le tour
  const { error } = await supabase
    .from('games')
    .update({
      current_turn_player_id: nextPlayer.user_id,
    })
    .eq('id', gameId)

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

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}
