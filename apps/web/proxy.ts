import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          // Isso é crucial para que o middleware consiga "escrever" o cookie 
          // e passar para a página seguinte no servidor
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()

  // 1. Proteger rotas (LOGIN)
  const protectedRoutes = ['/dashboard', '/studio', '/shop', '/chat', '/integrations']
  const isProtectedRoute = protectedRoutes.some(route => url.pathname.startsWith(route))

  if (isProtectedRoute && !user) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Lógica de Onboarding
  if (user && !url.pathname.startsWith('/onboarding') && !url.pathname.startsWith('/auth')) {
    const { data: profile } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single()

    if (!profile?.username || profile.username.includes(' ')) {
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return response
}

// O matcher continua igual
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}