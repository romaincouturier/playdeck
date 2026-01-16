import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GameLobby } from '@/components/game-lobby'
import { getGuestSession } from '@/lib/guest-session'
import { fetchGameState } from '@/lib/game/state-utils'

interface LobbyPageProps {
  params: Promise<{ id: string }>
}

export default async function LobbyPage({ params }: LobbyPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const guestSession = await getGuestSession()

  if (!user && !guestSession) {
    redirect('/login')
  }

  const gameState = await fetchGameState(id)

  if (gameState.status === 'playing') {
    redirect(`/games/${id}`)
  }

  if (gameState.status === 'finished') {
    redirect('/decks')
  }

  const currentPlayerId = user?.id || guestSession?.sessionId || ''
  const isInGame = gameState.players.some(
    (p) => (p.user_id || p.guest_session_id) === currentPlayerId
  )

  if (!isInGame) {
    redirect('/decks')
  }

  // Get raw game data for host_id if not in GameState
  const { data: game } = await supabase
    .from('games')
    .select('host_id, code')
    .eq('id', id)
    .single()

  const isHost = user ? game?.host_id === user.id : false
  const activePlayers = gameState.players.filter(p => p.is_active).length

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <GameLobby
        gameId={id}
        gameCode={game?.code || ''}
        deckName={gameState.deck_config.game_mode}
        maxPlayers={gameState.deck_config.max_players}
        currentPlayers={activePlayers}
        isHost={isHost}
        currentPlayerId={currentPlayerId}
        players={gameState.players as any}
      />
    </div>
  )
}
