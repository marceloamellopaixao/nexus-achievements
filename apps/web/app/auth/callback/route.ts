import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    let next = requestUrl.searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = await createClient();
        
        // Troca o código pela sessão e salva nos cookies automaticamente
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!error && data.user) {
            const { data: userData } = await supabase
                .from('users')
                .select('username')
                .eq('id', data.user.id)
                .single();

            // Validação do username para forçar onboarding
            const isValidUsername = /^[a-zA-Z0-9_]{3,20}$/.test(userData?.username || '');
            
            if (!isValidUsername) {
                next = "/onboarding";
            }

            // IMPORTANTE: Use a origem da requisição para evitar problemas de domínio na Vercel
            return NextResponse.redirect(new URL(next, requestUrl.origin));
        }
    }

    // Em caso de erro, redireciona para o login
    return NextResponse.redirect(new URL("/login?error=auth_failed", requestUrl.origin));
}