'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { deleteCard } from '@/app/decks/[id]/actions'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface Card {
  id: string
  deck_id: string
  image_url: string
  position: number
  created_at: string
}

interface CardGridProps {
  cards: Card[]
  deckId: string
}

export function CardGrid({ cards, deckId }: CardGridProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async (cardId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) return

    setDeletingId(cardId)
    try {
      await deleteCard(cardId, deckId)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Erreur lors de la suppression de la carte')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className="group relative aspect-[2/3] rounded-lg overflow-hidden border bg-card shadow-sm hover:shadow-lg transition-shadow"
        >
          <Image
            src={card.image_url}
            alt={`Carte ${card.position + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
            <Button
              variant="destructive"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDelete(card.id)}
              disabled={deletingId === card.id}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
