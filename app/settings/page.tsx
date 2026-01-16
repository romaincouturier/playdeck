'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/i18n-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/logo'
import { Footer } from '@/components/footer'
import { ArrowLeft, Globe, Check } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
    const { t, locale, setLocale } = useI18n()
    const router = useRouter()

    const languages = [
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    ]

    return (
        <div className="min-h-screen flex flex-col bg-st-gray dark:bg-st-anthracite">
            <header className="border-b bg-white/80 dark:bg-st-anthracite/80 backdrop-blur-sm sticky top-0 z-10 border-st-gray dark:border-st-anthracite">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/decks">
                        <Logo className="h-8" />
                    </Link>
                    <Link href="/decks">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('common.home')}
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
                <Card className="w-full max-w-2xl shadow-xl border-st-anthracite/5">
                    <CardHeader className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-st-yellow/20 rounded-lg">
                                <Globe className="h-6 w-6 text-st-yellow-dark" />
                            </div>
                            <CardTitle className="text-3xl font-bold">{t('settings.title')}</CardTitle>
                        </div>
                        <CardDescription className="text-lg">
                            {t('settings.customize')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                        <div className="space-y-4">
                            <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                {t('settings.language')}
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setLocale(lang.code as any)}
                                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all group ${locale === lang.code
                                            ? 'border-st-yellow bg-st-yellow/5'
                                            : 'border-st-gray dark:border-st-anthracite hover:border-st-yellow/40 hover:bg-st-yellow/5'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{lang.flag}</span>
                                            <span className={`font-semibold ${locale === lang.code ? 'text-st-anthracite dark:text-white' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                                {lang.name}
                                            </span>
                                        </div>
                                        {locale === lang.code && (
                                            <div className="h-6 w-6 rounded-full bg-st-yellow flex items-center justify-center">
                                                <Check className="h-4 w-4 text-st-anthracite" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-st-gray dark:border-st-anthracite flex justify-end">
                            <Button
                                onClick={() => router.push('/decks')}
                                className="bg-st-yellow hover:bg-st-yellow-dark text-st-anthracite font-bold px-8 py-6 rounded-xl"
                            >
                                {t('settings.save')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    )
}
