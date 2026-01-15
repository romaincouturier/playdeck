import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GameBoard } from '@/components/game-board'

interface GamePageProps {
  params: Promise<{ id: string }>
}

export default async function GamePage({ params }: GamePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Récupérer les informations de la partie
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, code, status, current_turn_player_id, deck_id, host_id')
    .eq('id', id)
    .single()

  if (gameError || !game) {
    redirect('/decks')
  }

  // Si la partie est en attente, rediriger vers le lobby
  if (game.status === 'waiting') {
    redirect(`/games/${id}/lobby`)
  }

  // Si la partie est terminée
  if (game.status === 'finished') {
    redirect('/decks')
  }

  // Vérifier que l'utilisateur est dans la partie
  const { data: player } = await supabase
    .from('game_players')
    .select('user_id, player_order, is_host, guest_name, guest_session_id')
    .eq('game_id', id)
    .eq('user_id', user.id)
    .single()

  if (!player) {
    redirect('/decks')
  }

  // Récupérer tous les joueurs
  const { data: players } = await supabase
    .from('game_players')
    .select('user_id, player_order, is_host, guest_name, guest_session_id')
    .eq('game_id', id)
    .order('player_order')

  // Récupérer le nom du deck
  const { data: deck } = await supabase
    .from('decks')
    .select('name')
    .eq('id', game.deck_id)
    .single()

  // Récupérer les cartes du joueur
  const { data: hand } = await supabase
    .from('game_cards')
    .select(`
      id,
      position,
      card:cards(id, image_url)
    `)
    .eq('game_id', id)
    .eq('location', 'hand')
    .eq('owner_user_id', user.id)
    .order('position')

  // Compter les cartes dans la pioche
  const { count: deckCount } = await supabase
    .from('game_cards')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', id)
    .eq('location', 'deck')

  // Compter les cartes dans la défausse
  const { count: discardCount } = await supabase
    .from('game_cards')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', id)
    .eq('location', 'discard')

  // Récupérer la dernière carte de la défausse
  const { data: topDiscard } = await supabase
    .from('game_cards')
    .select(`
      id,
      position,
      card:cards(id, image_url)
    `)
    .eq('game_id', id)
    .eq('location', 'discard')
    .order('position', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <GameBoard
        gameId={id}
        deckName={deck?.name || 'Deck'}
        currentTurnPlayerId={game.current_turn_player_id}
        userId={user.id}
        players={players || []}
        hand={(hand || []).map((card) => ({
          id: card.id,
          position: card.position,
          imageUrl: (card.card as any)?.image_url || '',
        }))}
        deckCount={deckCount || 0}
        discardCount={discardCount || 0}
        topDiscardCard={
          topDiscard
            ? {
                id: topDiscard.id,
                imageUrl: (topDiscard.card as any)?.image_url || '',
              }
            : null
        }
      />
    </div>
  )
}
