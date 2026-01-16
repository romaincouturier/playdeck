'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createGame } from '@/app/games/actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface Deck {
  id: string
  name: string
  description: string | null
  cards: any
}

interface CreateGameFormProps {
  decks: Deck[]
}

export function CreateGameForm({ decks }: CreateGameFormProps) {
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id || '')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log('[CreateGameForm] Début création partie')
      await createGame(selectedDeckId, maxPlayers)
      console.log('[CreateGameForm] Création terminée, redirection en cours')
      // La redirection est gérée par la Server Action
    } catch (err) {
      // Next.js utilise une erreur spéciale pour les redirections
      // On ne doit pas la traiter comme une vraie erreur
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
        console.log('[CreateGameForm] Redirection en cours...')
        // Ne pas définir d'erreur, laisser la redirection se faire
        return
      }

      console.error('[CreateGameForm] Erreur capturée:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création de la partie'
      console.error('[CreateGameForm] Message erreur:', errorMessage)
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sélection du deck */}
      <div className="space-y-3">
        <Label>Sélectionnez un deck</Label>
        <div className="grid gap-3">
          {decks.map((deck) => {
            const cardCount = Array.isArray(deck.cards) ? deck.cards.length : 0

            return (
              <Card
                key={deck.id}
                className={`p-4 cursor-pointer transition-colors ${selectedDeckId === deck.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                  }`}
                onClick={() => setSelectedDeckId(deck.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{deck.name}</h3>
                    {deck.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {deck.description}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {cardCount} carte{cardCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedDeckId === deck.id
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                      }`}
                  >
                    {selectedDeckId === deck.id && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Nombre de joueurs */}
      <div className="space-y-3">
        <Label>Nombre maximum de joueurs</Label>
        <div className="grid grid-cols-5 gap-2">
          {[2, 3, 4, 5, 6].map((num) => (
            <Button
              key={num}
              type="button"
              variant={maxPlayers === num ? 'default' : 'outline'}
              onClick={() => setMaxPlayers(num)}
              className="w-full"
            >
              {num}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border-2 border-destructive rounded-lg space-y-2">
          <h3 className="font-bold text-destructive">Erreur lors de la création de la partie</h3>
          <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Conseil : Ouvrez la console du navigateur (F12) pour voir les logs détaillés
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/decks')}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button type="submit" disabled={loading || !selectedDeckId} className="flex-1">
          {loading ? 'Création...' : 'Créer la partie'}
        </Button>
      </div>
    </form>
  )
}
