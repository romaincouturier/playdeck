import frDict from './dictionaries/fr.json';
import enDict from './dictionaries/en.json';
import esDict from './dictionaries/es.json';
import deDict from './dictionaries/de.json';
import { cookies } from 'next/headers';

type Locale = 'fr' | 'en' | 'es' | 'de';

const dictionaries = {
    fr: frDict,
    en: enDict,
    es: esDict,
    de: deDict,
};

export async function getLocale(): Promise<Locale> {
    const cookieStore = await cookies();
    const locale = cookieStore.get('locale')?.value as Locale;

    if (locale && locale in dictionaries) {
        return locale;
    }

    // Default fallback
    return 'en';
}

export async function getTranslations() {
    const locale = await getLocale();
    const dict = dictionaries[locale];

    return function t(key: string): string {
        const keys = key.split('.');
        let value: any = dict;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k as keyof typeof value];
            } else {
                return key;
            }
        }
        return typeof value === 'string' ? value : key;
    };
}
