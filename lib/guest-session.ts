import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

const GUEST_SESSION_COOKIE = 'guest_session_id'
const GUEST_NAME_COOKIE = 'guest_name'

export interface GuestSession {
  sessionId: string
  name: string
}

/**
 * Créer une session invité
 */
export async function createGuestSession(name: string): Promise<string> {
  const sessionId = randomUUID()
  const cookieStore = await cookies()

  cookieStore.set(GUEST_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  })

  cookieStore.set(GUEST_NAME_COOKIE, name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  })

  return sessionId
}

/**
 * Récupérer la session invité courante
 */
export async function getGuestSession(): Promise<GuestSession | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(GUEST_SESSION_COOKIE)?.value
  const name = cookieStore.get(GUEST_NAME_COOKIE)?.value

  if (!sessionId || !name) {
    return null
  }

  return { sessionId, name }
}

/**
 * Supprimer la session invité
 */
export async function deleteGuestSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(GUEST_SESSION_COOKIE)
  cookieStore.delete(GUEST_NAME_COOKIE)
}
