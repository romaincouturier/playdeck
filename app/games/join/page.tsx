import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JoinGameForm } from '@/components/join-game-form'
import { Footer } from '@/components/footer'
import { Logo } from '@/components/logo'

export default async function JoinGamePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // On n'oblige plus la connexion ici car on peut rejoindre en tant qu'invité
  // La redirection se fera via le formulaire vers /games/join/[code]
  // qui gère l'état connecté/invité

  return (
    <div className="min-h-screen flex flex-col bg-st-gray dark:bg-st-anthracite">
      <div className="flex-1 container mx-auto py-8 max-w-md">
        <div className="mb-8 text-center">
          <Logo className="h-12 mb-6 mx-auto" />
          <h1 className="text-3xl font-bold mb-2">Rejoindre une partie</h1>
          <p className="text-muted-foreground">
            Entrez le code à 6 caractères pour rejoindre une partie
          </p>
        </div>

        <JoinGameForm />
      </div>
      <Footer />
    </div>
  )
}
