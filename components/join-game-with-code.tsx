'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinGameAsGuest } from '@/app/games/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Users, Play } from 'lucide-react'
import { useI18n } from '@/lib/i18n/i18n-context'

interface JoinGameWithCodeProps {
  gameCode: string
  gameStatus: string
}

export function JoinGameWithCode({ gameCode, gameStatus }: JoinGameWithCodeProps) {
  const { t } = useI18n()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const fullName = `${firstName} ${lastName}`.trim()

      if (fullName.length < 2) {
        throw new Error(t('game.name_error'))
      }

      const gameId = await joinGameAsGuest(gameCode, fullName)
      router.push(`/games/${gameId}/lobby`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || t('login.error_occurred'))
      setLoading(false)
    }
  }

  if (gameStatus !== 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-st-gray dark:bg-st-anthracite">
        <div className="max-w-md w-full mx-4">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">{t('game.status_not_waiting_title')}</h1>
            <p className="text-muted-foreground">
              {t('game.status_not_waiting_desc')}
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-st-gray dark:bg-st-anthracite p-4">
      <div className="max-w-md w-full space-y-6">
        {/* En-tête avec le code de la partie */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{t('game.join_title')}</h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border">
            <Play className="w-4 h-4" />
            <span className="text-sm text-muted-foreground">{t('game.code_label')} :</span>
            <span className="text-2xl font-mono font-bold tracking-wider">{gameCode}</span>
          </div>
        </div>

        {/* Formulaire invité */}
        <Card className="p-6">
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                {t('game.guest_hint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">{t('game.first_name')}</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('game.first_name_placeholder')}
                required
                disabled={loading}
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">{t('game.last_name')}</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('game.last_name_placeholder')}
                required
                disabled={loading}
                minLength={2}
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('game.connecting') : t('game.join_title')}
            </Button>
          </form>
        </Card>

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            {t('game.guest_info')}
          </p>
        </div>
      </div>
    </div>
  )
}
