import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GameLobby } from '@/components/game-lobby'
import { getGuestSession } from '@/lib/guest-session'

interface LobbyPageProps {
  params: Promise<{ id: string }>
}

export default async function LobbyPage({ params }: LobbyPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Vérifier si c'est un invité
  const guestSession = await getGuestSession()

  if (!user && !guestSession) {
    redirect('/login')
  }

  // Récupérer les informations de la partie
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, code, status, max_players, host_id, deck_id')
    .eq('id', id)
    .single()

  if (gameError || !game) {
    redirect('/decks')
  }

  // Si la partie a commencé, rediriger vers la page de jeu
  if (game.status === 'playing') {
    redirect(`/games/${id}`)
  }

  // Si la partie est terminée, rediriger vers les decks
  if (game.status === 'finished') {
    redirect('/decks')
  }

  // Récupérer le nom du deck
  const { data: deck } = await supabase
    .from('decks')
    .select('name')
    .eq('id', game.deck_id)
    .single()

  // Récupérer les joueurs
  const { data: players, error: playersError } = await supabase
    .from('game_players')
    .select('user_id, player_order, is_host, guest_name, guest_session_id, has_left')
    .eq('game_id', id)
    .order('player_order')

  if (playersError || !players) {
    redirect('/decks')
  }

  // Vérifier que l'utilisateur/invité actuel est dans la partie
  const isInGame = players.some(
    (p) => p.user_id === user?.id || p.guest_session_id === guestSession?.sessionId
  )
  if (!isInGame) {
    redirect('/decks')
  }

  const isHost = user ? game.host_id === user.id : false
  const currentPlayerId = user?.id || guestSession?.sessionId || ''
  const activePlayers = players.filter(p => !p.has_left).length

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <GameLobby
        gameId={id}
        gameCode={game.code}
        deckName={deck?.name || 'Deck'}
        maxPlayers={game.max_players}
        currentPlayers={activePlayers}
        isHost={isHost}
        currentPlayerId={currentPlayerId}
        players={players}
      />
    </div>
  )
}
