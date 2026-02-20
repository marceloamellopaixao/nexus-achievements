'use client'

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();

  const handleLogin = async (provider: "discord" | "google") => {
    setLoading(provider);

    // O Next.js no ambiente local roda na porta 3000, mas no ambiente de produção, a porta é dinâmica. 
    // Usar a variável de ambiente NEXT_PUBLIC_BASE_URL garante que o redirecionamento funcione corretamente em ambos os ambientes.
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-gray-900 p-8 shadow-2xl border border-gray-800">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">Nexus Achievements</h2>
          <p className="mt-2 text-sm text-gray-400">Entre para sincronizar os seus troféus</p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={() => handleLogin('discord')}
            disabled={loading !== null}
            className="w-full flex justify-center py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-[#5865F2] hover:bg-[#4752C4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5865F2] disabled:opacity-50 transition-colors"
          >
            {loading === 'discord' ? 'A conectar...' : 'Continuar com Discord'}
          </button>

          <button
            onClick={() => handleLogin('google')}
            disabled={loading !== null}
            className="w-full flex justify-center py-3 px-4 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 transition-colors"
          >
            {loading === 'google' ? 'A conectar...' : 'Continuar com Google'}
          </button>
        </div>
      </div>
    </div>
  )
}