'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Shuffle, Eye, UserPlus, Trash2, RotateCcw, Trophy, Plus, Minus, Play, RefreshCw, SkipForward, FastForward } from 'lucide-react'

interface GMControlPanelProps {
  gameId: string
  isGameMaster: boolean
  players: Array<{ id: string; name: string; score: number }>
  onShuffle: () => void
  onRevealTop: () => void
  onDistributeCards: (count: number) => void
  onAddPoints: (playerId: string, points: number) => void
  onRemovePoints: (playerId: string, points: number) => void
  onDeclareWinner: (playerId: string) => void
  onNewRound: () => void
  onRecallCards: () => void
  onRandomFirstPlayer: () => void
  // P1 actions
  onReverseDirection: () => void
  onSkipPlayer: () => void
  onPassToPlayer: (playerId: string) => void
}

export function GMControlPanel({
  gameId,
  isGameMaster,
  players,
  onShuffle,
  onRevealTop,
  onDistributeCards,
  onAddPoints,
  onRemovePoints,
  onDeclareWinner,
  onNewRound,
  onRecallCards,
  onRandomFirstPlayer,
  onReverseDirection,
  onSkipPlayer,
  onPassToPlayer,
}: GMControlPanelProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [distributeCount, setDistributeCount] = useState(5)
  const [pointsValue, setPointsValue] = useState(10)

  if (!isGameMaster) {
    return null
  }

  return (
    <Card className="w-80 bg-st-anthracite/95 border-st-yellow/30 text-st-cream">
      <CardHeader>
        <CardTitle className="text-st-yellow flex items-center gap-2">
          <Play className="w-5 h-5" />
          Contrôles Game Master
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section: Distribution */}
        <div>
          <h3 className="font-semibold text-sm text-st-yellow mb-2">🎲 Distribution</h3>
          <div className="space-y-2">
            <Button
              onClick={onShuffle}
              className="w-full justify-start bg-st-gray hover:bg-st-gray/80"
              size="sm"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Mélanger le deck
            </Button>

            <Button
              onClick={onRevealTop}
              className="w-full justify-start bg-st-gray hover:bg-st-gray/80"
              size="sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              Révéler carte du dessus
            </Button>

            <div className="flex gap-2">
              <input
                type="number"
                value={distributeCount}
                onChange={(e) => setDistributeCount(Number(e.target.value))}
                className="w-16 px-2 py-1 text-sm bg-st-gray border border-st-yellow/30 rounded"
                min="1"
                max="10"
              />
              <Button
                onClick={() => onDistributeCards(distributeCount)}
                className="flex-1 justify-start bg-st-gray hover:bg-st-gray/80"
                size="sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Distribuer à tous
              </Button>
            </div>
          </div>
        </div>

        <Separator className="bg-st-yellow/20" />

        {/* Section: Gestion des tours */}
        <div>
          <h3 className="font-semibold text-sm text-st-yellow mb-2">🔄 Tours</h3>
          <div className="space-y-2">
            <Button
              onClick={onRandomFirstPlayer}
              className="w-full justify-start bg-st-gray hover:bg-st-gray/80"
              size="sm"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Premier joueur aléatoire
            </Button>

            {/* P1: REVERSE_DIRECTION */}
            <Button
              onClick={onReverseDirection}
              className="w-full justify-start bg-st-gray hover:bg-st-gray/80"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Inverser direction
            </Button>

            {/* P1: SKIP_PLAYER */}
            <Button
              onClick={onSkipPlayer}
              className="w-full justify-start bg-st-gray hover:bg-st-gray/80"
              size="sm"
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Sauter joueur actuel
            </Button>

            {/* P1: PASS_TO_PLAYER */}
            {selectedPlayer && (
              <Button
                onClick={() => onPassToPlayer(selectedPlayer)}
                className="w-full justify-start bg-blue-700 hover:bg-blue-600"
                size="sm"
              >
                <FastForward className="w-4 h-4 mr-2" />
                Forcer tour à ce joueur
              </Button>
            )}
          </div>
        </div>

        <Separator className="bg-st-yellow/20" />

        {/* Section: Scoring */}
        <div>
          <h3 className="font-semibold text-sm text-st-yellow mb-2">🏆 Scoring</h3>
          <div className="space-y-2">
            {/* Player selector */}
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="w-full px-2 py-1 text-sm bg-st-gray border border-st-yellow/30 rounded"
            >
              <option value="">Sélectionner joueur...</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} ({player.score} pts)
                </option>
              ))}
            </select>

            {selectedPlayer && (
              <>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={pointsValue}
                    onChange={(e) => setPointsValue(Number(e.target.value))}
                    className="w-16 px-2 py-1 text-sm bg-st-gray border border-st-yellow/30 rounded"
                    min="1"
                  />
                  <Button
                    onClick={() => onAddPoints(selectedPlayer, pointsValue)}
                    className="flex-1 justify-start bg-green-700 hover:bg-green-600"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                  <Button
                    onClick={() => onRemovePoints(selectedPlayer, pointsValue)}
                    className="flex-1 justify-start bg-red-700 hover:bg-red-600"
                    size="sm"
                  >
                    <Minus className="w-4 h-4 mr-2" />
                    Retirer
                  </Button>
                </div>

                <Button
                  onClick={() => onDeclareWinner(selectedPlayer)}
                  className="w-full justify-start bg-st-yellow text-st-anthracite hover:bg-st-yellow/80"
                  size="sm"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Déclarer vainqueur
                </Button>
              </>
            )}
          </div>
        </div>

        <Separator className="bg-st-yellow/20" />

        {/* Section: Gestion partie */}
        <div>
          <h3 className="font-semibold text-sm text-st-yellow mb-2">🎮 Partie</h3>
          <div className="space-y-2">
            <Button
              onClick={onRecallCards}
              className="w-full justify-start bg-st-gray hover:bg-st-gray/80"
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Rappeler toutes les cartes
            </Button>

            <Button
              onClick={onNewRound}
              className="w-full justify-start bg-blue-700 hover:bg-blue-600"
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Nouveau round
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
