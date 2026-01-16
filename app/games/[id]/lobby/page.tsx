import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GameLobby } from '@/components/game-lobby'
import { getGuestSession } from '@/lib/guest-session'
import { Button } from '@/components/ui/button'

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

  console.log('[LobbyPage] Game lookup:', { id, game, gameError })

  if (gameError || !game) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Erreur : Partie introuvable</h1>
        <p>ID: {id}</p>
        <pre className="mt-4 p-4 bg-muted rounded text-left overflow-auto">
          {JSON.stringify(gameError, null, 2)}
        </pre>
        <div className="mt-6">
          <Button asChild>
            <Link href="/decks">Retour aux collections</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Si la partie a commencé, rediriger vers la page de jeu
  if (game.status === 'playing') {
    redirect(`/games/${id}`)
  }

  // Si la partie est terminée, rediriger vers les decks
  if (game.status === 'finished') {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">La partie est terminée</h1>
        <Button asChild>
          <Link href="/decks">Retour aux collections</Link>
        </Button>
      </div>
    )
  }

  // Récupérer le nom du deck
  const { data: deck, error: deckError } = await supabase
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

  console.log('[LobbyPage] Debug info:', {
    gameFound: !!game,
    deckFound: !!deck,
    deckError,
    playerCount: players?.length,
    playersError
  })

  if (playersError || !players) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Erreur : Impossible de charger les joueurs</h1>
        <pre className="mt-4 p-4 bg-muted rounded text-left overflow-auto">
          {JSON.stringify(playersError, null, 2)}
        </pre>
        <div className="mt-6">
          <Button asChild>
            <Link href="/decks">Retour aux collections</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Vérifier que l'utilisateur/invité actuel est dans la partie
  const isInGame = players.some(
    (p) => p.user_id === user?.id || p.guest_session_id === guestSession?.sessionId
  )

  console.log('[LobbyPage] User check:', { userId: user?.id, guestSessionId: guestSession?.sessionId, isInGame })

  if (!isInGame) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Accès refusé</h1>
        <p>Vous n&apos;êtes pas inscrit dans cette partie.</p>
        <p className="text-sm mt-2 text-muted-foreground">ID Joueur : {user?.id || guestSession?.sessionId}</p>
        <div className="mt-4 p-4 bg-muted rounded text-left overflow-auto">
          <p className="font-semibold mb-2">Joueurs présents :</p>
          <pre>{JSON.stringify(players, null, 2)}</pre>
        </div>
        <div className="mt-6">
          <Button asChild>
            <Link href="/decks">Retour aux collections</Link>
          </Button>
        </div>
      </div>
    )
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
