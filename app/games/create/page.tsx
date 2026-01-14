import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreateGameForm } from '@/components/create-game-form'

export default async function CreateGamePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Récupérer les decks de l'utilisateur avec le nombre de cartes
  const { data: decks, error } = await supabase
    .from('decks')
    .select(`
      id,
      name,
      description,
      cards:cards(count)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching decks:', error)
    return (
      <div className="container mx-auto py-8">
        <p className="text-destructive">Erreur lors du chargement des decks</p>
      </div>
    )
  }

  // Filtrer les decks qui ont au moins une carte
  const validDecks = decks?.filter((deck) => {
    const cardCount = Array.isArray(deck.cards)
      ? deck.cards.length
      : (deck.cards as any)?.count || 0
    return cardCount > 0
  }) || []

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Créer une partie</h1>
        <p className="text-muted-foreground">
          Choisissez un deck et configurez votre partie
        </p>
      </div>

      {validDecks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Vous devez avoir au moins un deck avec des cartes pour créer une partie.
          </p>
          <a
            href="/decks"
            className="text-primary hover:underline"
          >
            Retour à mes decks
          </a>
        </div>
      ) : (
        <CreateGameForm decks={validDecks} />
      )}
    </div>
  )
}
