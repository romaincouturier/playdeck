import Link from 'next/link'
import { getDecks, signOut } from './actions'
import { CreateDeckDialog } from '@/components/create-deck-dialog'
import { DeckCard } from '@/components/deck-card'
import { Button } from '@/components/ui/button'
import { LogOut, Plus, Users } from 'lucide-react'

export default async function DecksPage() {
  const decks = await getDecks()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Mes Decks</h1>
          <div className="flex items-center gap-2">
            <Link href="/games/create">
              <Button variant="default" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Créer une partie
              </Button>
            </Link>
            <Link href="/games/join">
              <Button variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" />
                Rejoindre
              </Button>
            </Link>
            <form action={signOut}>
              <Button variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">Mes collections</h2>
            <p className="text-muted-foreground">
              Gérez vos decks de cartes et créez-en de nouveaux
            </p>
          </div>
          <CreateDeckDialog />
        </div>

        {decks.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Aucun deck pour le moment</h3>
            <p className="text-muted-foreground mb-6">
              Commencez par créer votre premier deck de cartes
            </p>
            <CreateDeckDialog />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {decks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
