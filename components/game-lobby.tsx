'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { startGame, leaveGame } from '@/app/games/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Users, Crown, Copy, Check } from 'lucide-react'

interface GameLobbyProps {
  gameId: string
  gameCode: string
  deckName: string
  maxPlayers: number
  currentPlayers: number
  isHost: boolean
  currentPlayerId: string
  players: Player[]
}

interface Player {
  user_id: string | null
  player_order: number
  is_host: boolean
  guest_name: string | null
  guest_session_id: string | null
}

export function GameLobby({
  gameId,
  gameCode,
  deckName,
  maxPlayers,
  currentPlayers: initialPlayers,
  isHost,
  currentPlayerId,
  players: initialPlayersList,
}: GameLobbyProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayersList)
  const [playerCount, setPlayerCount] = useState(initialPlayers)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Charger les joueurs au démarrage
  useEffect(() => {
    const loadPlayers = async () => {
      const { data, error } = await supabase
        .from('game_players')
        .select('user_id, player_order, is_host, guest_name, guest_session_id')
        .eq('game_id', gameId)
        .order('player_order')

      if (data && !error) {
        setPlayers(data)
        setPlayerCount(data.length)
      }
    }

    loadPlayers()
  }, [gameId, supabase])

  // Écouter les changements en temps réel
  useEffect(() => {
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`,
        },
        async () => {
          // Recharger la liste des joueurs
          const { data } = await supabase
            .from('game_players')
            .select('user_id, player_order, is_host, guest_name, guest_session_id')
            .eq('game_id', gameId)
            .order('player_order')

          if (data) {
            setPlayers(data)
            setPlayerCount(data.length)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        async (payload) => {
          // Si la partie a commencé, rediriger
          if (payload.new.status === 'playing') {
            router.push(`/games/${gameId}`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, router, supabase])

  const handleStartGame = async () => {
    if (playerCount < 2) {
      setError('Il faut au moins 2 joueurs pour commencer')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await startGame(gameId)
      // La redirection se fera via Realtime ou via l'action
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erreur lors du démarrage')
      setLoading(false)
    }
  }

  const handleLeaveGame = async () => {
    if (!confirm('Êtes-vous sûr de vouloir quitter la partie ?')) return

    setLoading(true)
    try {
      await leaveGame(gameId)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la sortie')
      setLoading(false)
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/games/join/${gameCode}`
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Salle d&apos;attente</h1>
        <p className="text-muted-foreground">Deck : {deckName}</p>
      </div>

      {/* Code de la partie */}
      <Card className="p-6 text-center bg-primary/5">
        <p className="text-sm text-muted-foreground mb-2">Code de la partie</p>
        <div className="flex items-center justify-center gap-2">
          <p className="text-4xl font-mono font-bold tracking-wider">{gameCode}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyCode}
            className="ml-2"
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Partagez ce code avec les autres joueurs
        </p>

        {/* Bouton pour copier le lien complet */}
        <div className="mt-4 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="w-full"
          >
            {linkCopied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Lien copié !
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copier le lien d&apos;invitation
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Les joueurs sans compte pourront se connecter et rejoindre directement
          </p>
        </div>
      </Card>

      {/* Liste des joueurs */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Joueurs</h2>
          </div>
          <span className="text-sm text-muted-foreground">
            {playerCount}/{maxPlayers}
          </span>
        </div>

        <div className="space-y-2">
          {players.map((player, index) => {
            const playerId = player.user_id || player.guest_session_id || ''
            const isCurrentPlayer = playerId === currentPlayerId
            const playerName = player.guest_name || (isCurrentPlayer ? 'Vous' : `Joueur ${index + 1}`)

            return (
              <div
                key={playerId}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  isCurrentPlayer
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{playerName}</p>
                  {player.guest_name && !isCurrentPlayer && (
                    <p className="text-xs text-muted-foreground">Invité</p>
                  )}
                </div>
                {player.is_host && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                    <Crown className="h-3 w-3" />
                    <span>Hôte</span>
                  </div>
                )}
              </div>
            )
          })}

          {/* Slots vides */}
          {Array.from({ length: maxPlayers - playerCount }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-muted"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {playerCount + i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">En attente...</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Message d'erreur */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleLeaveGame}
          disabled={loading}
          className="flex-1"
        >
          Quitter
        </Button>
        {isHost && (
          <Button
            onClick={handleStartGame}
            disabled={loading || playerCount < 2}
            className="flex-1"
          >
            {loading ? 'Démarrage...' : 'Démarrer la partie'}
          </Button>
        )}
      </div>

      {isHost && playerCount < 2 && (
        <p className="text-xs text-center text-muted-foreground">
          Il faut au moins 2 joueurs pour démarrer la partie
        </p>
      )}
    </div>
  )
}
