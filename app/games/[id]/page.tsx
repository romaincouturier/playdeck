import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GameBoard } from '@/components/game-board'
import { getGuestSession } from '@/lib/guest-session'
import { fetchGameState } from '@/lib/game/state-utils'

interface GamePageProps {
  params: Promise<{ id: string }>
}

export default async function GamePage({ params }: GamePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const guestSession = await getGuestSession()

  if (!user && !guestSession) {
    redirect('/login')
  }

  const playerId = user?.id || guestSession?.sessionId || ''
  const isGuest = !user && !!guestSession

  let gameState;
  try {
    gameState = await fetchGameState(id)
  } catch (error) {
    console.error('Error fetching game state:', error)
    redirect('/decks')
  }

  if (gameState.status === 'waiting') {
    redirect(`/games/${id}/lobby`)
  }

  if (gameState.status === 'finished') {
    redirect('/decks')
  }

  // Vérifier que le joueur fait partie de la partie
  const isPlayerInGame = gameState.players.some(p => (p.user_id || p.guest_session_id) === playerId)
  if (!isPlayerInGame) {
    redirect('/decks')
  }

  // v2: Vérifier si l'utilisateur est Game Master
  const { data: game } = await supabase
    .from('games')
    .select('game_master_id')
    .eq('id', id)
    .single()

  const isGameMaster = user ? game?.game_master_id === user.id : false

  // Map to GameBoard props
  const deckConfig = gameState.deck_config
  const handZone = deckConfig.zones.find(z => z.type === 'HAND') // v2: scope removed
  const deckZone = deckConfig.zones.find(z => z.type === 'DECK')
  const discardZone = deckConfig.zones.find(z => z.type === 'DISCARD' || z.type === 'PLAY_AREA')

  const myHand = gameState.cards
    .filter(c => c.zone_id === handZone?.id && c.owner_id === playerId)
    .sort((a: any, b: any) => a.position - b.position)

  return (
    <div className="min-h-screen bg-st-gray dark:bg-st-anthracite">
      <GameBoard
        gameId={id}
        deckName={deckConfig.game_mode}
        gameState={gameState}
        playerId={playerId}
        isGuest={isGuest}
        isGameMaster={isGameMaster}
        hand={myHand.map((c: any) => ({
          id: c.id,
          position: c.position,
          imageUrl: c.image_url,
        }))}
      />
    </div>
  )
}
