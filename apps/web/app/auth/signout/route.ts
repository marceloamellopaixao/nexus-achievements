import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createClient();

    // Limpa a sessão atual no Supabase e remove os cookies de autenticação
    await supabase.auth.signOut();

    // Redireciona o usuário para a página de login após o logout
    return NextResponse.redirect(new URL("/login", request.url));
}