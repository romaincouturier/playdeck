'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/logo'
import { Footer } from '@/components/footer'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gameCode, setGameCode] = useState('')
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
        alert('Vérifiez votre email pour confirmer votre inscription !')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/decks')
        router.refresh()
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Une erreur est survenue')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (gameCode.length === 6) {
      router.push(`/games/join/${gameCode.toUpperCase()}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-st-gray dark:bg-st-anthracite">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="mb-8">
          <Logo className="h-16" />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">
              {isSignUp ? 'Créer un compte' : 'Connexion'}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? 'Créez votre compte pour commencer à gérer vos decks'
                : 'Connectez-vous pour accéder à vos decks'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemple@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? 'Chargement...'
                  : isSignUp
                    ? "S'inscrire"
                    : 'Se connecter'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp
                  ? 'Déjà un compte ? Se connecter'
                  : "Pas de compte ? S'inscrire"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="relative w-full max-w-md my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-st-anthracite/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-st-gray dark:bg-st-anthracite px-2 text-muted-foreground">
              Ou
            </span>
          </div>
        </div>

        <Card className="w-full max-w-md border-st-yellow/30 bg-st-yellow/5">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              Rejoindre une partie
            </CardTitle>
            <CardDescription>
              Entrez le code à 6 caractères pour rejoindre vos amis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gameCode">Code de la partie</Label>
                <Input
                  id="gameCode"
                  placeholder="ABC123"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase().slice(0, 6))}
                  className="text-center font-mono text-xl tracking-widest"
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" variant="outline" className="w-full border-st-yellow/50 hover:bg-st-yellow/10">
                Rejoindre en tant qu&apos;invité
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
