'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { drawCard, playCard, passTurn, endGame, revealAll } from '@/app/games/[id]/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CardImage } from '@/components/card-image'
import { Crown, ArrowRight, Users } from 'lucide-react'
import { GameState, GameCardState, GamePlayerState } from '@/lib/game/engine'
import { fetchGameState } from '@/lib/game/state-utils' // Note: This might need a client version or just use Supabase directly for updates

interface HandCard {
  id: string
  position: number
  imageUrl: string
}

interface GameBoardProps {
  gameId: string
  deckName: string
  gameState: GameState
  playerId: string
  isGuest: boolean
  hand: HandCard[]
}

export function GameBoard({
  gameId,
  deckName,
  gameState: initialGameState,
  playerId,
  isGuest,
  hand: initialHand,
}: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const [hand, setHand] = useState<HandCard[]>(initialHand)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const currentTurnPlayerId = gameState.current_turn_player_id
  const players = gameState.players
  const deckConfig = gameState.deck_config

  const isMyTurn = currentTurnPlayerId === playerId
  // Host is usually the one with the lowest player_order or explicitly marked
  const isHost = players.find((p: GamePlayerState) => (p.user_id || p.guest_session_id) === playerId)?.player_order === 0

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase
      .channel(`game-state:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        () => handleStateChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_cards', filter: `game_id=eq.${gameId}` },
        () => handleStateChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        () => handleStateChange()
      )
      .subscribe()

    async function handleStateChange() {
      // In a real app, we'd probably call a server action or a thin client utility to fetch the full state
      // For now, let's refresh the page data or fetch from client
      // Refreshing the page is the simplest way to get consistent data through fetchGameState (server-side)
      router.refresh()
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, supabase, router])

  // Update local state when props change (via router.refresh())
  useEffect(() => {
    setGameState(initialGameState)
    setHand(initialHand)
  }, [initialGameState, initialHand])

  const handleDrawCard = async () => {
    setLoading(true)
    setError(null)
    try {
      await drawCard(gameId, isGuest ? playerId : undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du tirage')
    } finally {
      setLoading(false)
    }
  }

  const handlePlayCard = async (cardId: string) => {
    setLoading(true)
    setError(null)
    try {
      await playCard(gameId, cardId, isGuest ? playerId : undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du jeu de la carte')
    } finally {
      setLoading(false)
    }
  }

  const handlePassTurn = async () => {
    setLoading(true)
    setError(null)
    try {
      await passTurn(gameId, isGuest ? playerId : undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du passage du tour')
    } finally {
      setLoading(false)
    }
  }

  const handleEndGame = async () => {
    if (!confirm('Terminer la partie ?')) return
    setLoading(true)
    try {
      await endGame(gameId)
      router.push('/decks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la fin de la partie')
      setLoading(false)
    }
  }

  const handleRevealAll = async () => {
    setLoading(true)
    setError(null)
    try {
      await revealAll(gameId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la révélation')
    } finally {
      setLoading(false)
    }
  }

  // Find standard zones for rendering
  const deckZone = deckConfig.zones.find((z: any) => z.type === 'DECK')
  const discardZone = deckConfig.zones.find((z: any) => z.type === 'DISCARD' || z.type === 'PLAY_AREA')

  const deckCards = gameState.cards.filter((c: any) => c.location === deckZone?.id)
  const discardCards = gameState.cards
    .filter((c: any) => c.location === discardZone?.id)
    .sort((a: any, b: any) => b.position - a.position)
  const topDiscard = discardCards[0]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-st-anthracite/10 bg-white dark:bg-st-anthracite">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-st-anthracite dark:text-white">{deckName}</h1>
              <p className="text-sm">
                {isMyTurn ? (
                  <span className="text-st-yellow font-semibold">C&apos;est votre tour !</span>
                ) : (
                  <span className="text-muted-foreground">En attente des autres joueurs...</span>
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

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Joueurs */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" />
              <h2 className="font-semibold">Joueurs</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {players.map((player: GamePlayerState, index: number) => {
                const playerUniqueId = player.user_id || player.guest_session_id || ''
                const isCurrentUser = playerUniqueId === playerId
                const cardCount = gameState.cards.filter((c: any) => c.owner_id === playerUniqueId).length

                return (
                  <div
                    key={playerUniqueId}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${isCurrentUser
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-muted'
                      } ${currentTurnPlayerId === playerUniqueId ? 'ring-2 ring-st-yellow' : ''
                      } ${!player.is_active ? 'opacity-50' : ''
                      }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {player.name}
                        {player.player_order === 0 && <Crown className="inline h-3 w-3 ml-1 text-st-yellow" />}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cardCount} carte(s)
                      </p>
                    </div>
                    {currentTurnPlayerId === playerUniqueId && (
                      <ArrowRight className="h-4 w-4 text-st-yellow" />
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Table */}
          <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="space-y-3">
              <h3 className="text-center font-semibold">Pioche</h3>
              <div className="aspect-[2/3] relative">
                {deckCards.length > 0 ? (
                  <Card className="absolute inset-0 bg-gradient-to-br from-st-yellow to-st-anthracite flex items-center justify-center border-2 border-st-yellow">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-st-anthracite">{deckCards.length}</p>
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
                disabled={!isMyTurn || loading || deckCards.length === 0}
                className="w-full"
              >
                Piocher
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-center font-semibold">
                {discardZone?.name || 'Défausse'}
              </h3>
              <div className="aspect-[2/3] relative">
                {topDiscard ? (
                  <Card className="absolute inset-0 overflow-hidden">
                    {gameState.current_phase_id === 'reveal' ? (
                      <CardImage
                        src={(topDiscard as any).image_url}
                        alt="Carte défaussée"
                        position={0}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-st-anthracite flex items-center justify-center border-2 border-primary">
                        <span className="text-primary font-bold">VOTE</span>
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card className="absolute inset-0 bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground">Vide</p>
                  </Card>
                )}
              </div>
              <div className="text-center text-sm text-muted-foreground">
                {discardCards.length} carte(s)
              </div>
              {isHost && gameState.current_phase_id === 'voting' && discardCards.length > 0 && (
                <Button onClick={handleRevealAll} className="w-full mt-2" disabled={loading}>
                  Révéler les votes
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Main */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Votre main ({hand.length})</h3>
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
                Main vide.
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {hand.map((card: HandCard) => (
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
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-medium">
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
