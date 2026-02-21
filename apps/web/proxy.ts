import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Criamos a resposta inicial
  let response = NextResponse.next({
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
          // 1. Atualiza os cookies na REQUISIÇÃO (para o Next.js ler na página)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // 2. Cria uma nova resposta para garantir que os cookies sejam enviados ao navegador
          response = NextResponse.next({ request })
          // 3. Define os cookies na RESPOSTA final
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Se o usuário está logado e tenta ir para /login, manda para /dashboard
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Se NÃO está logado e tenta ir para rota protegida, manda para /login
  const protectedRoutes = ['/dashboard', '/studio', '/shop', '/chat']
  if (!user && protectedRoutes.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}