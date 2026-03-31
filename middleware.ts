import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getTokenRole(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded.role ?? null
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('timbas_token')?.value
  const { pathname } = request.nextUrl

  // ── Dashboard ─────────────────────────────────────────────
  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── Admin ─────────────────────────────────────────────────
  const isAdminArea = pathname.startsWith('/admin') && pathname !== '/admin/login'

  if (isAdminArea) {
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const role = getTokenRole(token)
    if (role !== 'ADMIN') {
      const res = NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url))
      res.cookies.delete('timbas_token')
      return res
    }
  }

  // Prevent logged-in admins from hitting admin/login again
  if (token && pathname === '/admin/login') {
    const role = getTokenRole(token)
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/admin/:path*', '/admin/login'],
}
