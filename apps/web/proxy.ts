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
  const url = request.nextUrl.clone()

  // 1. Se NÃO está logado e tenta ir para rota protegida, manda para /login
  const protectedRoutes = ['/dashboard', '/studio', '/shop', '/chat', '/profile', '/integrations']
  const isProtectedRoute = protectedRoutes.some(path => url.pathname.startsWith(path))

  if (!user && isProtectedRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Se ESTÁ logado, precisamos verificar se o perfil "físico" dele existe no banco
  if (user && !url.pathname.startsWith('/auth')) {
    
    // A MÁGICA: Usamos maybeSingle() em vez de single() para não gerar Erro 500 se o banco foi resetado
    const { data: profile } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()

    // Valida se o perfil não existe (reset), não tem username, ou tem username inválido (com espaço)
    const needsOnboarding = !profile || !profile.username || profile.username.includes(' ')

    // Se precisa de onboarding e não está na página de onboarding, redireciona para lá
    if (needsOnboarding && !url.pathname.startsWith('/onboarding')) {
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    // Se NÃO precisa de onboarding (perfil 100% OK) e tenta acessar telas iniciais, manda pro dashboard
    if (!needsOnboarding && (url.pathname === '/login' || url.pathname === '/onboarding' || url.pathname === '/')) {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}