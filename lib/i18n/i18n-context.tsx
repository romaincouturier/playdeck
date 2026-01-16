'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import fr from './dictionaries/fr.json'
import en from './dictionaries/en.json'
import es from './dictionaries/es.json'
import de from './dictionaries/de.json'

type Locale = 'fr' | 'en' | 'es' | 'de'
type Translations = typeof fr

interface I18nContextType {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: string) => string
}

const translations: Record<Locale, Translations> = { fr, en, es, de }

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('fr')

    useEffect(() => {
        const savedLocale = localStorage.getItem('locale') as Locale
        if (savedLocale && translations[savedLocale]) {
            setLocaleState(savedLocale)
        } else {
            const browserLang = navigator.language.split('-')[0] as Locale
            if (translations[browserLang]) {
                setLocaleState(browserLang)
            }
        }
    }, [])

    useEffect(() => {
        localStorage.setItem('locale', locale)
        document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`
        document.documentElement.lang = locale
    }, [locale])

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale)
    }

    const t = (key: string) => {
        const keys = key.split('.')
        let result: any = translations[locale]

        for (const k of keys) {
            if (result[k] === undefined) {
                console.warn(`Translation key not found: ${key} for locale: ${locale}`)
                return key
            }
            result = result[k]
        }

        return result as string
    }

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    )
}

export function useI18n() {
    const context = useContext(I18nContext)
    if (context === undefined) {
        throw new Error('useI18n must be used within an I18nProvider')
    }
    return context
}
