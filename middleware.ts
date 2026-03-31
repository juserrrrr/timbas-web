import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

export function middleware(request: NextRequest) {
  const token = request.cookies.get('timbas_token')?.value
  const { pathname } = request.nextUrl

  const hasValidToken = token && !isTokenExpired(token)

  // ── Dashboard ─────────────────────────────────────────────
  if (!hasValidToken && pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
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
  matcher: ['/dashboard/:path*', '/login', '/admin/:path*', '/admin/login'],
}
