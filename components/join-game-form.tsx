'use client'

import React, { useState, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { joinGame } from '@/app/games/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function JoinGameForm() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (code.length !== 6) {
      setError('Le code doit contenir 6 caractères')
      return
    }

    setLoading(true)
    setError(null)

    try {
      router.push(`/games/join/${code.toUpperCase()}`)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la connexion à la partie')
      setLoading(false)
    }
  }

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 6)
    setCode(value)
    setError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="code">Code de la partie</Label>
        <Input
          id="code"
          type="text"
          value={code}
          onChange={handleCodeChange}
          placeholder="ABC123"
          className="text-center text-2xl font-mono tracking-wider uppercase"
          maxLength={6}
          autoFocus
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground text-center">
          Le code est composé de 6 caractères (lettres et chiffres)
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
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
        <Button
          type="submit"
          disabled={loading || code.length !== 6}
          className="flex-1"
        >
          {loading ? 'Connexion...' : 'Rejoindre'}
        </Button>
      </div>
    </form>
  )
}
