'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { drawCard, playCard, passTurn, endGame } from '@/app/games/[id]/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CardImage } from '@/components/card-image'
import { Crown, ArrowRight, Users } from 'lucide-react'

interface Player {
  user_id: string
  player_order: number
  is_host: boolean
}

interface HandCard {
  id: string
  position: number
  imageUrl: string
}

interface GameBoardProps {
  gameId: string
  deckName: string
  currentTurnPlayerId: string | null
  userId: string
  players: Player[]
  hand: HandCard[]
  deckCount: number
  discardCount: number
  topDiscardCard: { id: string; imageUrl: string } | null
}

export function GameBoard({
  gameId,
  deckName,
  currentTurnPlayerId: initialTurnPlayerId,
  userId,
  players: initialPlayers,
  hand: initialHand,
  deckCount: initialDeckCount,
  discardCount: initialDiscardCount,
  topDiscardCard: initialTopDiscard,
}: GameBoardProps) {
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState(initialTurnPlayerId)
  const [hand, setHand] = useState<HandCard[]>(initialHand)
  const [deckCount, setDeckCount] = useState(initialDeckCount)
  const [discardCount, setDiscardCount] = useState(initialDiscardCount)
  const [topDiscardCard, setTopDiscardCard] = useState(initialTopDiscard)
  const [players, setPlayers] = useState(initialPlayers)
  const [playerCardCounts, setPlayerCardCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const isMyTurn = currentTurnPlayerId === userId
  const isHost = players.find((p) => p.user_id === userId)?.is_host || false

  // Charger le nombre de cartes par joueur
  useEffect(() => {
    const loadPlayerCardCounts = async () => {
      const counts: Record<string, number> = {}

      for (const player of players) {
        const { count } = await supabase
          .from('game_cards')
          .select('*', { count: 'exact', head: true })
          .eq('game_id', gameId)
          .eq('location', 'hand')
          .eq('owner_user_id', player.user_id)

        counts[player.user_id] = count || 0
      }

      setPlayerCardCounts(counts)
    }

    loadPlayerCardCounts()
  }, [gameId, players, supabase])

  // Écouter les changements en temps réel
  useEffect(() => {
    const channel = supabase
      .channel(`game-board:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        async (payload) => {
          if (payload.new.status === 'finished') {
            router.push('/decks')
            return
          }

          setCurrentTurnPlayerId(payload.new.current_turn_player_id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_cards',
          filter: `game_id=eq.${gameId}`,
        },
        async () => {
          // Recharger la main du joueur
          const { data: handData } = await supabase
            .from('game_cards')
            .select(`
              id,
              position,
              card:cards(id, image_url)
            `)
            .eq('game_id', gameId)
            .eq('location', 'hand')
            .eq('owner_user_id', userId)
            .order('position')

          if (handData) {
            setHand(
              handData.map((card) => ({
                id: card.id,
                position: card.position,
                imageUrl: (card.card as any)?.image_url || '',
              }))
            )
          }

          // Recharger le compte de la pioche
          const { count: newDeckCount } = await supabase
            .from('game_cards')
            .select('*', { count: 'exact', head: true })
            .eq('game_id', gameId)
            .eq('location', 'deck')

          setDeckCount(newDeckCount || 0)

          // Recharger le compte de la défausse et la carte du dessus
          const { count: newDiscardCount } = await supabase
            .from('game_cards')
            .select('*', { count: 'exact', head: true })
            .eq('game_id', gameId)
            .eq('location', 'discard')

          setDiscardCount(newDiscardCount || 0)

          const { data: topDiscard } = await supabase
            .from('game_cards')
            .select(`
              id,
              card:cards(id, image_url)
            `)
            .eq('game_id', gameId)
            .eq('location', 'discard')
            .order('position', { ascending: false })
            .limit(1)
            .single()

          if (topDiscard) {
            setTopDiscardCard({
              id: topDiscard.id,
              imageUrl: (topDiscard.card as any)?.image_url || '',
            })
          } else {
            setTopDiscardCard(null)
          }

          // Recharger les comptes de cartes des joueurs
          const counts: Record<string, number> = {}
          for (const player of players) {
            const { count } = await supabase
              .from('game_cards')
              .select('*', { count: 'exact', head: true })
              .eq('game_id', gameId)
              .eq('location', 'hand')
              .eq('owner_user_id', player.user_id)

            counts[player.user_id] = count || 0
          }
          setPlayerCardCounts(counts)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, userId, router, supabase, players])

  const handleDrawCard = async () => {
    setLoading(true)
    setError(null)

    try {
      await drawCard(gameId)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erreur lors du tirage')
    } finally {
      setLoading(false)
    }
  }

  const handlePlayCard = async (cardId: string) => {
    setLoading(true)
    setError(null)

    try {
      await playCard(gameId, cardId)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erreur lors du jeu de la carte')
    } finally {
      setLoading(false)
    }
  }

  const handlePassTurn = async () => {
    setLoading(true)
    setError(null)

    try {
      await passTurn(gameId)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erreur lors du passage du tour')
    } finally {
      setLoading(false)
    }
  }

  const handleEndGame = async () => {
    if (!confirm('Êtes-vous sûr de vouloir terminer cette partie ?')) return

    setLoading(true)
    try {
      await endGame(gameId)
      router.push('/decks')
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la fin de la partie')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* En-tête */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{deckName}</h1>
              <p className="text-sm text-muted-foreground">
                {isMyTurn ? (
                  <span className="text-green-600 font-semibold">C&apos;est votre tour !</span>
                ) : (
                  <span>En attente du joueur {players.findIndex((p) => p.user_id === currentTurnPlayerId) + 1}...</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isHost && (
                <Button variant="outline" size="sm" onClick={handleEndGame} disabled={loading}>
                  Terminer la partie
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => router.push('/decks')}>
                Quitter
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Zone de jeu */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Autres joueurs */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" />
              <h2 className="font-semibold">Joueurs</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {players.map((player, index) => (
                <div
                  key={player.user_id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    player.user_id === userId
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-muted'
                  } ${
                    currentTurnPlayerId === player.user_id ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {player.user_id === userId ? 'Vous' : `Joueur ${index + 1}`}
                      {player.is_host && <Crown className="inline h-3 w-3 ml-1 text-amber-600" />}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {playerCardCounts[player.user_id] || 0} carte(s)
                    </p>
                  </div>
                  {currentTurnPlayerId === player.user_id && (
                    <ArrowRight className="h-4 w-4 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Zone centrale : Pioche et Défausse */}
          <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Pioche */}
            <div className="space-y-3">
              <h3 className="text-center font-semibold">Pioche</h3>
              <div className="aspect-[2/3] relative">
                {deckCount > 0 ? (
                  <Card className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white">
                    <div className="text-center">
                      <p className="text-4xl font-bold">{deckCount}</p>
                      <p className="text-sm">carte(s)</p>
                    </div>
                  </Card>
                ) : (
                  <Card className="absolute inset-0 bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground">Vide</p>
                  </Card>
                )}
              </div>
              <Button
                onClick={handleDrawCard}
                disabled={!isMyTurn || loading || deckCount === 0}
                className="w-full"
              >
                Piocher
              </Button>
            </div>

            {/* Défausse */}
            <div className="space-y-3">
              <h3 className="text-center font-semibold">Défausse</h3>
              <div className="aspect-[2/3] relative">
                {topDiscardCard ? (
                  <Card className="absolute inset-0 overflow-hidden">
                    <CardImage
                      src={topDiscardCard.imageUrl}
                      alt="Carte défaussée"
                      position={0}
                    />
                  </Card>
                ) : (
                  <Card className="absolute inset-0 bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground">Vide</p>
                  </Card>
                )}
              </div>
              <div className="text-center text-sm text-muted-foreground">
                {discardCount} carte(s)
              </div>
            </div>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Main du joueur */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Votre main ({hand.length} carte{hand.length > 1 ? 's' : ''})</h3>
              <Button
                onClick={handlePassTurn}
                disabled={!isMyTurn || loading}
                variant="outline"
              >
                Passer le tour
              </Button>
            </div>
            {hand.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                Votre main est vide. Piochez une carte pour commencer.
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {hand.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handlePlayCard(card.id)}
                    disabled={!isMyTurn || loading}
                    className="group relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CardImage
                      src={card.imageUrl}
                      alt={`Carte ${card.position + 1}`}
                      position={card.position}
                    />
                    {isMyTurn && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-medium">
                          Jouer
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
