'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteDeck, duplicateDeck } from '@/app/decks/actions'
import { useI18n } from '@/lib/i18n/i18n-context'
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
  const { t, locale } = useI18n()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(t('decks.delete_confirm'))) return

    setLoading(true)
    try {
      await deleteDeck(deck.id)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(t('decks.delete_error'))
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
      alert(t('decks.duplicate_error'))
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
              {deck.description || t('decks.no_description')}
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
                {t('decks.duplicate')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('decks.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {t('decks.created_on')} {new Date(deck.created_at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'de-DE')}
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/decks/${deck.id}`} className="w-full">
          <Button variant="outline" className="w-full" disabled={loading}>
            {t('decks.view_cards')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
