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
        <div className="mb-12 text-center">
          <Logo className="h-20 mb-2" />
          <p className="text-muted-foreground font-medium">L&apos;aventure commence ici.</p>
        </div>

        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-start">
          <Card className="w-full shadow-lg border-st-anthracite/5">
            <CardHeader>
              <CardTitle className="text-2xl">
                {isSignUp ? 'Créer un compte' : 'Espace Membre'}
              </CardTitle>
              <CardDescription>
                {isSignUp
                  ? 'Créez votre compte pour gérer vos decks'
                  : 'Accédez à votre collection de cartes'}
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
                  className="w-full text-xs"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp
                    ? 'Déjà un compte ? Se connecter'
                    : "Pas de compte ? Créer un profil"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="hidden md:flex flex-col items-center justify-center h-full">
            <div className="w-px h-full bg-st-anthracite/10 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-st-gray dark:bg-st-anthracite p-3 rounded-full border border-st-anthracite/10 text-xs font-bold uppercase text-muted-foreground">
                Ou
              </div>
            </div>
          </div>

          <Card className="w-full shadow-xl border-st-yellow/40 bg-st-yellow/5">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                Rejoindre des amis
              </CardTitle>
              <CardDescription>
                Accédez à une partie en cours sans compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinByCode} className="space-y-6 pt-2">
                <div className="space-y-3">
                  <Label htmlFor="gameCode" className="text-center block text-sm font-bold uppercase tracking-widest text-st-yellow-dark">Code de la partie</Label>
                  <Input
                    id="gameCode"
                    placeholder="ABC123"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase().slice(0, 6))}
                    className="text-center font-mono text-4xl h-20 tracking-[0.5em] uppercase border-st-yellow/30 bg-white/50 focus:border-st-yellow"
                    maxLength={6}
                    required
                  />
                  <p className="text-[10px] text-center text-muted-foreground uppercase tracking-tighter">
                    Entrez le code à 6 caractères partagé par l&apos;hôte
                  </p>
                </div>
                <Button type="submit" className="w-full bg-st-yellow hover:bg-st-yellow-dark text-st-anthracite font-bold py-6 text-lg">
                  Entrer dans la partie
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}
