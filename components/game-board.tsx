'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { drawCard, playCard, passTurn, endGame, revealAll } from '@/app/games/[id]/actions'
import {
  shuffleDeck,
  revealTopCard,
  distributeCardsToAll,
  addPoints,
  removePoints,
  declareWinner,
  startNewRound,
  recallAllCards,
  randomFirstPlayer,
  // P1 GM actions
  reverseTurnDirection,
  skipCurrentPlayer,
  passToSpecificPlayer,
} from '@/app/games/[id]/gm-actions'
import {
  returnCardToDeck,
  giveCardToPlayer,
  flipCard,
  revealCardToAll,
  drawBottomCard,
  takeFromDiscard,
} from '@/app/games/[id]/player-actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CardImage } from '@/components/card-image'
import { GMControlPanel } from '@/components/gm-control-panel'
import { CardContextMenu } from '@/components/card-context-menu'
import { Crown, ArrowRight, Users } from 'lucide-react'
import { GameState, GameCardState, GamePlayerState } from '@/lib/game/engine'

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
  isGameMaster: boolean
  hand: HandCard[]
}

export function GameBoard({
  gameId,
  deckName,
  gameState: initialGameState,
  playerId,
  isGuest,
  isGameMaster,
  hand: initialHand,
}: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const [hand, setHand] = useState<HandCard[]>(initialHand)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const currentTurnPlayerId = gameState.current_player_id // v2: renamed from current_turn_player_id
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

  // === GM HANDLERS (P0 Primitives) ===
  const handleShuffle = async () => {
    setLoading(true)
    setError(null)
    try {
      await shuffleDeck(gameId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du mélange')
    } finally {
      setLoading(false)
    }
  }

  const handleRevealTop = async () => {
    setLoading(true)
    setError(null)
    try {
      await revealTopCard(gameId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la révélation')
    } finally {
      setLoading(false)
    }
  }

  const handleDistributeCards = async (count: number) => {
    setLoading(true)
    setError(null)
    try {
      await distributeCardsToAll(gameId, count)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la distribution')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPoints = async (playerId: string, points: number) => {
    setLoading(true)
    setError(null)
    try {
      await addPoints(gameId, playerId, points)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout de points')
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePoints = async (playerId: string, points: number) => {
    setLoading(true)
    setError(null)
    try {
      await removePoints(gameId, playerId, points)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du retrait de points')
    } finally {
      setLoading(false)
    }
  }

  const handleDeclareWinner = async (playerId: string) => {
    setLoading(true)
    try {
      await declareWinner(gameId, playerId)
      router.push('/decks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la déclaration du vainqueur')
      setLoading(false)
    }
  }

  const handleNewRound = async () => {
    setLoading(true)
    setError(null)
    try {
      await startNewRound(gameId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du nouveau round')
    } finally {
      setLoading(false)
    }
  }

  const handleRecallCards = async () => {
    setLoading(true)
    setError(null)
    try {
      await recallAllCards(gameId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du rappel des cartes')
    } finally {
      setLoading(false)
    }
  }

  const handleRandomFirstPlayer = async () => {
    setLoading(true)
    setError(null)
    try {
      await randomFirstPlayer(gameId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sélection aléatoire')
    } finally {
      setLoading(false)
    }
  }

  // === P1 GM HANDLERS - Advanced Turn Management ===
  const handleReverseDirection = async () => {
    setLoading(true)
    setError(null)
    try {
      await reverseTurnDirection(gameId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'inversion de direction')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipPlayer = async () => {
    setLoading(true)
    setError(null)
    try {
      await skipCurrentPlayer(gameId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du saut de joueur')
    } finally {
      setLoading(false)
    }
  }

  const handlePassToPlayer = async (targetPlayerId: string) => {
    setLoading(true)
    setError(null)
    try {
      await passToSpecificPlayer(gameId, targetPlayerId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du passage de tour')
    } finally {
      setLoading(false)
    }
  }

  // === P1 PLAYER HANDLERS - Advanced Card Actions ===
  const handleReturnToDeck = async (cardId: string) => {
    setLoading(true)
    setError(null)
    try {
      await returnCardToDeck(gameId, cardId, isGuest ? playerId : undefined)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du retour au deck')
    } finally {
      setLoading(false)
    }
  }

  const handleGiveToPlayer = async (cardId: string, targetPlayerId: string) => {
    setLoading(true)
    setError(null)
    try {
      await giveCardToPlayer(gameId, cardId, targetPlayerId, isGuest ? playerId : undefined)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du don de carte')
    } finally {
      setLoading(false)
    }
  }

  const handleFlipCard = async (cardId: string) => {
    setLoading(true)
    setError(null)
    try {
      await flipCard(gameId, cardId, isGuest ? playerId : undefined)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du retournement')
    } finally {
      setLoading(false)
    }
  }

  const handleRevealToAll = async (cardId: string) => {
    setLoading(true)
    setError(null)
    try {
      await revealCardToAll(gameId, cardId, isGuest ? playerId : undefined)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la révélation')
    } finally {
      setLoading(false)
    }
  }

  const handleDrawBottom = async () => {
    setLoading(true)
    setError(null)
    try {
      await drawBottomCard(gameId, isGuest ? playerId : undefined)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du tirage du bas')
    } finally {
      setLoading(false)
    }
  }

  const handleTakeFromDiscard = async () => {
    setLoading(true)
    setError(null)
    try {
      await takeFromDiscard(gameId, isGuest ? playerId : undefined)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la prise de la défausse')
    } finally {
      setLoading(false)
    }
  }

  // Find standard zones for rendering
  const deckZone = deckConfig.zones.find((z: any) => z.type === 'DECK')
  const discardZone = deckConfig.zones.find((z: any) => z.type === 'DISCARD' || z.type === 'PLAY_AREA')

  const deckCards = gameState.cards.filter((c: any) => c.zone_id === deckZone?.id) // v2: renamed from location
  const discardCards = gameState.cards
    .filter((c: any) => c.zone_id === discardZone?.id) // v2: renamed from location
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

      <div className="flex-1 flex">
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
                    {/* Display card based on zone visibility - PUBLIC zones show cards face up */}
                    {discardZone?.visibility === 'PUBLIC' || discardZone?.default_face === 'UP' ? (
                      <CardImage
                        src={(topDiscard as any).image_url}
                        alt="Carte"
                        position={0}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-st-yellow to-st-anthracite flex items-center justify-center border-2 border-st-yellow">
                        <div className="text-st-anthracite text-4xl font-bold">?</div>
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
                  <div key={card.id} className="group relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all">
                    <button
                      onClick={() => handlePlayCard(card.id)}
                      disabled={!isMyTurn || loading}
                      className="absolute inset-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    {/* P1: Card Context Menu */}
                    <CardContextMenu
                      cardId={card.id}
                      playerId={playerId}
                      players={players.map((p: GamePlayerState) => ({
                        id: p.user_id || p.guest_session_id || '',
                        name: p.name,
                      }))}
                      isMyTurn={isMyTurn}
                      isGameMaster={isGameMaster}
                      onReturnToDeck={handleReturnToDeck}
                      onGiveToPlayer={handleGiveToPlayer}
                      onFlipCard={handleFlipCard}
                      onRevealToAll={handleRevealToAll}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* GM Control Panel (sidebar) */}
      {isGameMaster && (
        <aside className="w-80 flex-shrink-0 p-4 bg-st-gray dark:bg-st-anthracite border-l border-st-yellow/20">
          <GMControlPanel
            gameId={gameId}
            isGameMaster={isGameMaster}
            players={players.map((p: GamePlayerState) => ({
              id: p.id,
              name: p.name,
              score: p.score || 0,
            }))}
            onShuffle={handleShuffle}
            onRevealTop={handleRevealTop}
            onDistributeCards={handleDistributeCards}
            onAddPoints={handleAddPoints}
            onRemovePoints={handleRemovePoints}
            onDeclareWinner={handleDeclareWinner}
            onNewRound={handleNewRound}
            onRecallCards={handleRecallCards}
            onRandomFirstPlayer={handleRandomFirstPlayer}
            onReverseDirection={handleReverseDirection}
            onSkipPlayer={handleSkipPlayer}
            onPassToPlayer={handlePassToPlayer}
          />
        </aside>
      )}
    </div>
    </div>
  )
}
