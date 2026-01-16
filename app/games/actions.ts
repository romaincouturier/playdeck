'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createGuestSession, getGuestSession } from '@/lib/guest-session'

export async function createGame(deckId: string, maxPlayers: number) {
  const supabase = await createClient()

  // Vérifier l'authentification
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  console.log('[CreateGame] Début création partie pour deck:', deckId)

  // Vérifier que le deck appartient à l'utilisateur
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, user_id')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()

  if (deckError) {
    console.error('[CreateGame] Erreur deck:', deckError)
    throw new Error(`Deck introuvable: ${deckError.message}`)
  }

  if (!deck) {
    throw new Error('Deck introuvable')
  }

  // Vérifier que le deck a des cartes
  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id')
    .eq('deck_id', deckId)

  if (cardsError) {
    console.error('[CreateGame] Erreur cartes:', cardsError)
    throw new Error(`Erreur de vérification des cartes: ${cardsError.message}`)
  }

  if (!cards || cards.length === 0) {
    throw new Error('Le deck doit contenir au moins une carte')
  }

  console.log('[CreateGame] Deck valide avec', cards.length, 'cartes')

  // Générer un code unique
  let code = ''
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    // Appeler la fonction SQL pour générer le code
    const { data: codeData, error: codeError } = await supabase.rpc('generate_game_code')

    if (codeError) {
      console.error('[CreateGame] Erreur génération code:', codeError)
      throw new Error(`ERREUR SQL: La fonction generate_game_code() n'existe pas dans Supabase. Veuillez exécuter le fichier supabase/game-schema.sql dans votre base de données.`)
    }

    if (!codeData) {
      throw new Error('Aucun code généré')
    }

    code = codeData

    // Vérifier que le code n'existe pas déjà
    const { data: existingGame } = await supabase
      .from('games')
      .select('id')
      .eq('code', code)
      .single()

    if (!existingGame) {
      break
    }

    attempts++
  }

  if (!code || attempts >= maxAttempts) {
    throw new Error('Impossible de générer un code unique')
  }

  console.log('[CreateGame] Code généré:', code)

  // Créer la partie
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      host_id: user.id,
      deck_id: deckId,
      code,
      max_players: maxPlayers,
      status: 'waiting',
    })
    .select()
    .single()

  if (gameError) {
    console.error('[CreateGame] Erreur création partie:', gameError)
    throw new Error(`Erreur lors de la création de la partie: ${gameError.message} (${gameError.code})`)
  }

  if (!game) {
    throw new Error('Aucune partie créée')
  }

  console.log('[CreateGame] Partie créée:', game.id)

  // Ajouter l'hôte comme premier joueur
  const { error: playerError } = await supabase.from('game_players').insert({
    game_id: game.id,
    user_id: user.id,
    player_order: 0,
    is_host: true,
  })

  if (playerError) {
    console.error('[CreateGame] Erreur ajout joueur:', playerError)
    // Supprimer la partie si l'ajout du joueur échoue
    await supabase.from('games').delete().eq('id', game.id)
    throw new Error(`Erreur lors de l'ajout du joueur: ${playerError.message} (${playerError.code})`)
  }

  console.log('[CreateGame] Joueur ajouté, retour de l\'ID de la partie')

  revalidatePath('/games')
  revalidatePath(`/games/${game.id}/lobby`)

  // Retourner l'ID au lieu de rediriger pour éviter les problèmes de timing RLS
  return game.id
}

export async function joinGame(code: string) {
  const supabase = await createClient()

  // Vérifier l'authentification
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  // Trouver la partie avec le code
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status, max_players')
    .eq('code', code.toUpperCase())
    .single()

  if (gameError || !game) {
    throw new Error('Partie introuvable')
  }

  // Vérifier que la partie est en attente
  if (game.status !== 'waiting') {
    throw new Error('La partie a déjà commencé')
  }

  // Vérifier que le joueur n'est pas déjà dans la partie
  const { data: existingPlayer } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', game.id)
    .eq('user_id', user.id)
    .single()

  if (existingPlayer) {
    // Le joueur est déjà dans la partie, le rediriger vers le lobby
    return game.id
  }

  // Compter le nombre de joueurs
  const { data: players, error: playersError } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', game.id)

  if (playersError) {
    throw new Error('Erreur lors de la vérification des joueurs')
  }

  if (players && players.length >= game.max_players) {
    throw new Error('La partie est complète')
  }

  // Ajouter le joueur
  const playerOrder = players ? players.length : 0
  const { error: joinError } = await supabase.from('game_players').insert({
    game_id: game.id,
    user_id: user.id,
    player_order: playerOrder,
    is_host: false,
  })

  if (joinError) {
    throw new Error('Erreur lors de la connexion à la partie')
  }

  revalidatePath(`/games/${game.id}/lobby`)
  return game.id
}

export async function joinGameAsGuest(code: string, guestName: string) {
  const supabase = await createClient()

  // Créer une session invité
  const guestSessionId = await createGuestSession(guestName)

  // Trouver la partie avec le code
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status, max_players')
    .eq('code', code.toUpperCase())
    .single()

  if (gameError || !game) {
    throw new Error('Partie introuvable')
  }

  // Vérifier que l'invité n'est pas déjà dans la partie (AVANT de vérifier le statut)
  const { data: existingPlayer } = await supabase
    .from('game_players')
    .select('id, has_left')
    .eq('game_id', game.id)
    .eq('guest_session_id', guestSessionId)
    .single()

  if (existingPlayer) {
    // Si l'invité avait quitté, le marquer comme revenu
    if (existingPlayer.has_left) {
      await supabase
        .from('game_players')
        .update({ has_left: false })
        .eq('id', existingPlayer.id)
    }
    // L'invité est déjà dans la partie, le rediriger vers la bonne page
    // Pas d'erreur même si la partie a commencé !
    revalidatePath(`/games/${game.id}/lobby`)
    return game.id
  }

  // MAINTENANT on vérifie que la partie est en attente (pour les NOUVEAUX joueurs uniquement)
  if (game.status !== 'waiting') {
    throw new Error('La partie a déjà commencé')
  }

  // Compter le nombre de joueurs
  const { data: players, error: playersError } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', game.id)

  if (playersError) {
    throw new Error('Erreur lors de la vérification des joueurs')
  }

  if (players && players.length >= game.max_players) {
    throw new Error('La partie est complète')
  }

  // Ajouter l'invité
  const playerOrder = players ? players.length : 0
  const { error: joinError } = await supabase.from('game_players').insert({
    game_id: game.id,
    user_id: null,
    guest_session_id: guestSessionId,
    guest_name: guestName,
    player_order: playerOrder,
    is_host: false,
  })

  if (joinError) {
    console.error('Erreur ajout invité:', joinError)
    throw new Error(`Erreur lors de la connexion à la partie: ${joinError.message}`)
  }

  revalidatePath(`/games/${game.id}/lobby`)
  return game.id
}

export async function startGame(gameId: string) {
  const supabase = await createClient()

  // Vérifier l'authentification
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  // Vérifier que l'utilisateur est l'hôte
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, host_id, status')
    .eq('id', gameId)
    .eq('host_id', user.id)
    .single()

  if (gameError || !game) {
    throw new Error('Partie introuvable ou vous n\'êtes pas l\'hôte')
  }

  if (game.status !== 'waiting') {
    throw new Error('La partie a déjà commencé')
  }

  // Vérifier qu'il y a au moins 2 joueurs
  const { data: players, error: playersError } = await supabase
    .from('game_players')
    .select('user_id')
    .eq('game_id', gameId)
    .order('player_order')

  if (playersError || !players || players.length < 2) {
    throw new Error('Il faut au moins 2 joueurs pour commencer')
  }

  // Mettre à jour le statut de la partie
  const { error: updateError } = await supabase
    .from('games')
    .update({
      status: 'playing',
      started_at: new Date().toISOString(),
      current_turn_player_id: players[0].user_id,
    })
    .eq('id', gameId)

  if (updateError) {
    throw new Error('Erreur lors du démarrage de la partie')
  }

  // Distribuer les cartes
  const { error: distributeError } = await supabase.rpc('distribute_cards', {
    p_game_id: gameId,
    p_cards_per_player: 5,
  })

  if (distributeError) {
    throw new Error('Erreur lors de la distribution des cartes')
  }

  // On ne revalide pas car on quitte le lobby
  return gameId
}

export async function leaveGame(gameId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const guestSession = await getGuestSession()

  if (!user && !guestSession) {
    throw new Error('Non authentifié')
  }

  // Marquer le joueur comme parti au lieu de le supprimer
  const { error } = await supabase
    .from('game_players')
    .update({ has_left: true })
    .eq('game_id', gameId)
    .or(user ? `user_id.eq.${user.id}` : `guest_session_id.eq.${guestSession?.sessionId}`)

  if (error) {
    throw new Error('Erreur lors de la sortie de la partie')
  }

  revalidatePath('/decks')
  redirect('/decks')
}
