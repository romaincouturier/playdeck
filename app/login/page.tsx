'use client'

import React, { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/logo'
import { Footer } from '@/components/footer'
import { useI18n } from '@/lib/i18n/i18n-context'

export default function LoginPage() {
  const { t, locale, setLocale } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gameCode, setGameCode] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isResetPassword, setIsResetPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: FormEvent) => {
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
        alert(t('login.check_email'))
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
        setError(t('login.error_occurred'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setResetEmailSent(true)
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(t('login.error_occurred'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleJoinByCode = (e: FormEvent) => {
    e.preventDefault()
    if (gameCode.length === 6) {
      router.push(`/games/join/${gameCode.toUpperCase()}`)
    }
  }
  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-st-gray dark:bg-st-anthracite relative overflow-hidden">
      {/* Barre de langue discrète style glassmorphism */}
      <div className="absolute top-4 right-4 z-50 flex gap-1 md:gap-2 p-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-sm">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLocale(lang.code as any)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${locale === lang.code
              ? 'bg-st-yellow text-st-anthracite shadow-md'
              : 'text-muted-foreground hover:bg-white/20 hover:text-foreground'
              }`}
            title={lang.name}
          >
            <span className="md:mr-1">{lang.flag}</span>
            <span className="hidden lg:inline">{lang.name}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="mb-12 text-center">
          <Logo className="h-20 mb-2" />
          <p className="text-muted-foreground font-medium">{t('login.welcome')}</p>
        </div>

        <div className="w-full max-w-5xl grid md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-center">
          <Card className="w-full shadow-lg border-st-anthracite/5 self-start">
            <CardHeader>
              <CardTitle className="text-2xl">
                {isResetPassword
                  ? t('login.reset_password_title')
                  : isSignUp
                    ? t('login.signup_title')
                    : t('login.member_area')}
              </CardTitle>
              <CardDescription>
                {isResetPassword
                  ? t('login.reset_password_desc')
                  : isSignUp
                    ? t('login.signup_desc')
                    : t('login.login_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isResetPassword ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {resetEmailSent ? (
                    <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                      {t('login.reset_email_sent')}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">{t('login.email')}</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="exemple@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      {error && (
                        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                          {error}
                        </div>
                      )}
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? t('login.loading') : t('login.send_reset_link')}
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => {
                      setIsResetPassword(false)
                      setResetEmailSent(false)
                      setError(null)
                    }}
                  >
                    {t('login.back_to_login')}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('login.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="exemple@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  {!isSignUp && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">{t('login.password')}</Label>
                        <button
                          type="button"
                          onClick={() => setIsResetPassword(true)}
                          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                        >
                          {t('login.forgot_password')}
                        </button>
                      </div>
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
                  )}
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('login.password')}</Label>
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
                  )}
                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading
                      ? t('login.loading')
                      : isSignUp
                        ? t('login.signup_button')
                        : t('login.login_button')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => setIsSignUp(!isSignUp)}
                  >
                    {isSignUp
                      ? t('login.has_account')
                      : t('login.no_account')}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="flex md:flex-col items-center justify-center my-4 md:my-0 md:h-full">
            <div className="h-px w-8 md:w-px md:h-32 bg-st-anthracite/10"></div>
            <div className="bg-st-gray dark:bg-st-anthracite p-3 rounded-full border border-st-anthracite/10 text-xs font-bold uppercase text-muted-foreground mx-4 md:mx-0 md:my-4">
              {t('login.or')}
            </div>
            <div className="h-px w-8 md:w-px md:h-32 bg-st-anthracite/10"></div>
          </div>

          <Card className="w-full shadow-xl border-st-yellow/40 bg-st-yellow/5">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                {t('login.join_friends')}
              </CardTitle>
              <CardDescription>
                {t('login.join_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinByCode} className="space-y-6 pt-2">
                <div className="space-y-3">
                  <Label htmlFor="gameCode" className="text-center block text-sm font-bold uppercase tracking-widest text-st-yellow-dark">{t('login.game_code')}</Label>
                  <Input
                    id="gameCode"
                    placeholder={t('login.game_code_placeholder')}
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase().slice(0, 6))}
                    className="text-center font-mono text-4xl h-20 tracking-[0.5em] uppercase border-st-yellow/30 bg-white/50 focus:border-st-yellow"
                    maxLength={6}
                    required
                  />
                  <p className="text-[10px] text-center text-muted-foreground uppercase tracking-tighter">
                    {t('login.game_code_hint')}
                  </p>
                </div>
                <Button type="submit" className="w-full bg-st-yellow hover:bg-st-yellow-dark text-st-anthracite font-bold py-6 text-lg">
                  {t('login.enter_game')}
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
