import { NextRequest, NextResponse } from 'next/server'
import {
  getDefaultRouteForRole,
  getResourceForPath,
  can,
  isDashboardPath,
  isKioskPath,
} from '@/lib/auth/authorization'

const PUBLIC_PATHS = ['/login']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value
  const role = request.cookies.get('auth_role')?.value

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (!token && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (token && isPublic) {
    if (!role) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL(getDefaultRouteForRole(role), request.url))
  }

  if (token) {
    if (!role) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('auth_token')
      response.cookies.delete('auth_role')
      return response
    }

    const resource = getResourceForPath(pathname)
    if (
      (isDashboardPath(pathname) || isKioskPath(pathname))
      && (!resource || !can(role, 'read', resource))
    ) {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(role), request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|apple-icon\\.png|manifest|api/proxy|api/auth).*)',
  ],
}
