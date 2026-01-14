import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JoinGameForm } from '@/components/join-game-form'

export default async function JoinGamePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto py-8 max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Rejoindre une partie</h1>
        <p className="text-muted-foreground">
          Entrez le code à 6 caractères pour rejoindre une partie
        </p>
      </div>

      <JoinGameForm />
    </div>
  )
}
