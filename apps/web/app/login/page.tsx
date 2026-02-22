'use client'

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import Link from "next/link";
import Head from "next/head";

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();

  const handleLogin = async (provider: "discord" | "google") => {
    setLoading(provider);
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`;

    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUrl }
    });
  }

  return (
    <>
      <Head>
        <title>Login | Nexus Achievements</title>
        <meta name="description" content="Faça login no Nexus Achievements para sincronizar seus troféus, comparar conquistas com amigos e participar da comunidade de caçadores de troféus. Conecte-se usando Discord ou Google e comece a dominar o ranking!" />
      </Head>
      <div className="flex w-full min-h-[calc(100vh-10rem)] md:min-h-[calc(100vh-12rem)] items-center justify-center relative overflow-hidden rounded-3xl">

        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-md space-y-6 rounded-3xl bg-surface/80 backdrop-blur-xl p-8 sm:p-10 shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-primary/30 relative z-10 animate-in zoom-in-95 duration-500">

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mb-4 shadow-inner">
              <span className="text-3xl drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">🌌</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white">NEXUS</h2>
            <p className="mt-2 text-sm text-gray-400 font-medium">Sincronize os seus troféus e domine o ranking.</p>
          </div>

          <div className="mt-8 space-y-4">
            <button
              onClick={() => handleLogin('discord')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5865F2] disabled:opacity-50 transition-all group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">👾</span>
              {loading === 'discord' ? 'A conectar...' : 'Continuar com Discord'}
            </button>

            <button
              onClick={() => handleLogin('google')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 transition-all group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">G</span>
              {loading === 'google' ? 'A conectar...' : 'Continuar com Google'}
            </button>
          </div>

          <div className="pt-6 mt-6 border-t border-border/50 text-center">
            <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-widest">
              ← Voltar ao Início
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}