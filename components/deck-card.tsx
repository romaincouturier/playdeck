'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteDeck, duplicateDeck } from '@/app/decks/actions'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Copy, MoreVertical, Trash2 } from 'lucide-react'

interface Deck {
  id: string
  name: string
  description: string | null
  created_at: string
}

export function DeckCard({ deck }: { deck: Deck }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce deck ?')) return

    setLoading(true)
    try {
      await deleteDeck(deck.id)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Erreur lors de la suppression du deck')
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicate = async () => {
    setLoading(true)
    try {
      const newDeckId = await duplicateDeck(deck.id)
      router.refresh()
      if (newDeckId) {
        router.push(`/decks/${newDeckId}`)
      }
    } catch (error) {
      console.error(error)
      alert('Erreur lors de la duplication du deck')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="line-clamp-1">{deck.name}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1.5">
              {deck.description || 'Aucune description'}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={loading}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Dupliquer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          Créé le {new Date(deck.created_at).toLocaleDateString('fr-FR')}
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/decks/${deck.id}`} className="w-full">
          <Button variant="outline" className="w-full" disabled={loading}>
            Voir les cartes
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
