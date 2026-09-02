import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CLEAN_DASHBOARD_ROOTS = new Set([
  'matches', 'match', 'history', 'stats', 'teams', 'versus', 'ranking',
  'tournaments', 'draft', 'ea-clubs', 'clash', 'verify', 'lol-profile',
  'streams', 'games', 'profile', 'settings',
])

const LEGACY_DASHBOARD_ROOTS: Record<string, string> = {
  active: 'matches',
  live: 'streams',
}

function decodeTokenPayload(token: string): Record<string, any> | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

function isTokenExpired(token: string): boolean {
  const decoded = decodeTokenPayload(token)
  if (!decoded || typeof decoded.exp !== 'number') return true
  return decoded.exp * 1000 < Date.now()
}

function getTokenRole(token: string): string | null {
  return decodeTokenPayload(token)?.role ?? null
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('timbas_token')?.value
  const { pathname } = request.nextUrl

  const hasValidToken = token && !isTokenExpired(token)

  if (pathname.startsWith('/dashboard/')) {
    const segments = pathname.slice('/dashboard/'.length).split('/')
    segments[0] = LEGACY_DASHBOARD_ROOTS[segments[0]] ?? segments[0]
    const cleanUrl = request.nextUrl.clone()
    cleanUrl.pathname = `/${segments.join('/')}`
    return NextResponse.redirect(cleanUrl)
  }

  // ── Dashboard ─────────────────────────────────────────────
  const cleanRoot = pathname.split('/')[1]
  const isDashboardArea = pathname === '/dashboard' || CLEAN_DASHBOARD_ROOTS.has(cleanRoot)
  if (!hasValidToken && isDashboardArea) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`)
    const res = NextResponse.redirect(loginUrl)
    if (token) {
      res.cookies.delete('timbas_token')
      res.cookies.delete('timbas_refresh_token')
    }
    return res
  }
  if (hasValidToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── Admin ─────────────────────────────────────────────────
  const isAdminArea = pathname.startsWith('/admin') && pathname !== '/admin/login'

  if (isAdminArea) {
    if (!hasValidToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const role = getTokenRole(token!)
    if (role !== 'ADMIN') {
      const res = NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url))
      res.cookies.delete('timbas_token')
      return res
    }
  }

  // Prevent logged-in admins from hitting admin/login again
  if (hasValidToken && pathname === '/admin/login') {
    const role = getTokenRole(token!)
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/login', '/admin/:path*', '/admin/login',
    '/matches/:path*', '/match/:path*', '/history/:path*', '/stats/:path*',
    '/teams/:path*', '/versus/:path*', '/ranking/:path*', '/tournaments/:path*',
    '/draft/:path*', '/ea-clubs/:path*', '/clash/:path*', '/verify/:path*',
    '/lol-profile/:path*', '/streams/:path*', '/games/:path*', '/profile/:path*',
    '/settings/:path*',
  ],
}
