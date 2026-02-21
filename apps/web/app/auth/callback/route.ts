import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    let next = requestUrl.searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!error && data.user) {
            // Busca o username que foi gerado automaticamente pelo banco de dados
            const { data: userData } = await supabase
                .from('users')
                .select('username')
                .eq('id', data.user.id)
                .single();

            // A MÁGICA: Se o username tiver espaços ou caracteres especiais, forçamos o Onboarding!
            const isValidUsername = /^[a-zA-Z0-9_]{3,20}$/.test(userData?.username || '');
            
            if (!isValidUsername) {
                next = "/onboarding";
            }

            return NextResponse.redirect(new URL(next, request.url));
        }
    }

    return NextResponse.redirect(new URL("/login?error=true", request.url));
}