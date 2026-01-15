import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JoinGameWithCode } from '@/components/join-game-with-code'
import { getGuestSession } from '@/lib/guest-session'

interface JoinGameWithCodePageProps {
  params: Promise<{ code: string }>
}

export default async function JoinGameWithCodePage({ params }: JoinGameWithCodePageProps) {
  const { code } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Valider le format du code
  if (!/^[A-Z0-9]{6}$/.test(code.toUpperCase())) {
    redirect('/decks')
  }

  // Vérifier que la partie existe
  const { data: game, error } = await supabase
    .from('games')
    .select('id, code, status, max_players')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-st-gray dark:bg-st-anthracite">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Partie introuvable</h1>
            <p className="text-muted-foreground mb-6">
              Le code <span className="font-mono font-semibold">{code.toUpperCase()}</span> ne correspond à aucune partie active.
            </p>
            <a
              href="/decks"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Si l'utilisateur n'est pas connecté, vérifier s'il a une session invité
  if (!user) {
    const guestSession = await getGuestSession()

    // Si c'est un invité, vérifier s'il est déjà dans la partie
    if (guestSession) {
      const { data: existingGuestPlayer } = await supabase
        .from('game_players')
        .select('id, has_left')
        .eq('game_id', game.id)
        .eq('guest_session_id', guestSession.sessionId)
        .single()

      if (existingGuestPlayer) {
        // Si l'invité avait quitté, le marquer comme revenu
        if (existingGuestPlayer.has_left) {
          await supabase
            .from('game_players')
            .update({ has_left: false })
            .eq('id', existingGuestPlayer.id)
        }

        // Rediriger vers la page appropriée selon le statut de la partie
        if (game.status === 'playing') {
          redirect(`/games/${game.id}`)
        } else {
          redirect(`/games/${game.id}/lobby`)
        }
      }
    }

    // Si pas de session invité ou invité pas dans la partie, afficher la page de join
    return <JoinGameWithCode gameCode={game.code} gameStatus={game.status} />
  }

  // Si l'utilisateur est connecté, rejoindre automatiquement la partie
  // Vérifier si l'utilisateur est déjà dans la partie
  const { data: existingPlayer } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', game.id)
    .eq('user_id', user.id)
    .single()

  if (existingPlayer) {
    // Déjà dans la partie, rediriger vers le lobby
    redirect(`/games/${game.id}/lobby`)
  }

  // Vérifier que la partie accepte encore des joueurs
  if (game.status !== 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-st-gray dark:bg-st-anthracite">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Partie déjà commencée</h1>
            <p className="text-muted-foreground mb-6">
              Cette partie a déjà commencé ou est terminée.
            </p>
            <a
              href="/decks"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Compter le nombre de joueurs
  const { data: players } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', game.id)

  if (players && players.length >= game.max_players) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-st-gray dark:bg-st-anthracite">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Partie complète</h1>
            <p className="text-muted-foreground mb-6">
              Cette partie a atteint le nombre maximum de joueurs ({game.max_players}).
            </p>
            <a
              href="/decks"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Ajouter le joueur automatiquement
  const playerOrder = players ? players.length : 0
  const { error: joinError } = await supabase.from('game_players').insert({
    game_id: game.id,
    user_id: user.id,
    player_order: playerOrder,
    is_host: false,
  })

  if (joinError) {
    console.error('Error joining game:', joinError)
    return (
      <div className="min-h-screen flex items-center justify-center bg-st-gray dark:bg-st-anthracite">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Erreur</h1>
            <p className="text-muted-foreground mb-6">
              Impossible de rejoindre la partie. Veuillez réessayer.
            </p>
            <a
              href="/decks"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Rediriger vers le lobby
  redirect(`/games/${game.id}/lobby`)
}
