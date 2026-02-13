'use client'

import { useState } from 'react'
import { MoreVertical, RotateCcw, Users, Repeat, Eye, Share2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface CardContextMenuProps {
  cardId: string
  playerId: string
  players: Array<{ id: string; name: string }>
  isMyTurn: boolean
  isGameMaster: boolean
  onReturnToDeck: (cardId: string) => void
  onGiveToPlayer: (cardId: string, targetPlayerId: string) => void
  onFlipCard: (cardId: string) => void
  onRevealToAll: (cardId: string) => void
}

export function CardContextMenu({
  cardId,
  playerId,
  players,
  isMyTurn,
  isGameMaster,
  onReturnToDeck,
  onGiveToPlayer,
  onFlipCard,
  onRevealToAll,
}: CardContextMenuProps) {
  const [open, setOpen] = useState(false)

  const otherPlayers = players.filter(p => p.id !== playerId)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
        >
          <MoreVertical className="h-4 w-4 text-white" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* P1: FLIP_CARD */}
        <DropdownMenuItem
          disabled={!isMyTurn && !isGameMaster}
          onClick={() => {
            onFlipCard(cardId)
            setOpen(false)
          }}
        >
          <Repeat className="mr-2 h-4 w-4" />
          Retourner la carte
        </DropdownMenuItem>

        {/* P1: REVEAL_TO_ALL */}
        <DropdownMenuItem
          disabled={!isMyTurn && !isGameMaster}
          onClick={() => {
            onRevealToAll(cardId)
            setOpen(false)
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          Révéler à tous
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* P1: RETURN_TO_DECK */}
        <DropdownMenuItem
          disabled={!isMyTurn && !isGameMaster}
          onClick={() => {
            onReturnToDeck(cardId)
            setOpen(false)
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Retourner au deck
        </DropdownMenuItem>

        {/* P1: GIVE_TO_PLAYER */}
        {otherPlayers.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!isMyTurn && !isGameMaster}>
              <Share2 className="mr-2 h-4 w-4" />
              Donner à...
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {otherPlayers.map((player) => (
                <DropdownMenuItem
                  key={player.id}
                  onClick={() => {
                    onGiveToPlayer(cardId, player.id)
                    setOpen(false)
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {player.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
