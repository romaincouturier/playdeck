import Link from 'next/link'
import { getDeck, getCards } from './actions'
import { CardUpload } from '@/components/card-upload'
import { CardGrid } from '@/components/card-grid'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/footer'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from '@/lib/i18n/i18n-server'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DeckDetailPage({ params }: PageProps) {
  const { id } = await params
  const deck = await getDeck(id)
  const cards = await getCards(id)
  const t = await getTranslations()

  return (
    <div className="min-h-screen bg-st-gray dark:bg-st-anthracite flex flex-col">
      <header className="border-b bg-white/80 dark:bg-st-anthracite/80 backdrop-blur-sm sticky top-0 z-10 border-st-gray dark:border-st-anthracite">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/decks">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{deck.name}</h1>
              {deck.description && (
                <p className="text-sm text-muted-foreground">
                  {deck.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">{t('upload.add_card')}</h2>
            <CardUpload deckId={id} cardCount={cards.length} />
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {t('upload.cards_in_deck')} ({cards.length}/500)
              </h2>
            </div>
            {cards.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  {t('upload.none')}
                </p>
              </div>
            ) : (
              <CardGrid cards={cards} deckId={id} />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
