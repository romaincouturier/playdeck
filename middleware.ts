import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if user has a guest session
  const hasGuestSession = request.cookies.get('guest_session_id')?.value

  // Allow public access to game join pages
  const isPublicGameJoinPage = request.nextUrl.pathname.match(/^\/games\/join\/[A-Z0-9]{6}$/)

  // Allow access to game pages for guests
  const isGamePage = request.nextUrl.pathname.match(/^\/games\/[a-f0-9-]+\/(lobby|$)/)

  // Redirect to login if not authenticated and not a guest, and trying to access protected routes
  // Exceptions: public game join pages, game pages for guests
  if (!user && !hasGuestSession && !request.nextUrl.pathname.startsWith('/login') && !isPublicGameJoinPage && !isGamePage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Allow guests to access game pages
  if (!user && hasGuestSession && isGamePage) {
    return supabaseResponse
  }

  // Redirect to dashboard if authenticated and trying to access login
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    // Check if there's a redirect parameter
    const redirect = request.nextUrl.searchParams.get('redirect')
    const url = request.nextUrl.clone()
    url.pathname = redirect || '/decks'
    url.search = '' // Clear search params
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
