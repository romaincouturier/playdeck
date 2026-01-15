'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Users, Play } from 'lucide-react'

interface JoinGameWithCodeProps {
  gameCode: string
  gameStatus: string
}

export function JoinGameWithCode({ gameCode, gameStatus }: JoinGameWithCodeProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        // Après inscription, recharger la page pour rejoindre automatiquement
        router.refresh()
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // Après connexion, recharger la page pour rejoindre automatiquement
        router.refresh()
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Une erreur est survenue')
      setLoading(false)
    }
  }

  if (gameStatus !== 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-md w-full mx-4">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Partie déjà commencée</h1>
            <p className="text-muted-foreground">
              Cette partie a déjà commencé ou est terminée.
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full space-y-6">
        {/* En-tête avec le code de la partie */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Rejoindre la partie</h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border">
            <Play className="w-4 h-4" />
            <span className="text-sm text-muted-foreground">Code :</span>
            <span className="text-2xl font-mono font-bold tracking-wider">{gameCode}</span>
          </div>
        </div>

        {/* Formulaire de connexion/inscription */}
        <Card className="p-6">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                isSignUp ? 'Inscription...' : 'Connexion...'
              ) : (
                isSignUp ? 'S\'inscrire et rejoindre' : 'Se connecter et rejoindre'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                disabled={loading}
              >
                {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
              </button>
            </div>
          </form>
        </Card>

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Vous allez rejoindre automatiquement la partie après connexion
          </p>
        </div>
      </div>
    </div>
  )
}
