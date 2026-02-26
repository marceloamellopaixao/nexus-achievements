'use client'

import { useState } from "react";
import { updateNickname } from "./actions";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import Head from "next/head";

export default function OnboardingPage() {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await updateNickname(nickname);

    if (result.error) {
      toast.error(result.error, { theme: 'dark' });
      setLoading(false);
    } else {
      toast.success("Bem-vindo ao Nexus!", { theme: 'dark', icon: <span>🚀</span> });
      setTimeout(() => {
        router.push("/social");
      }, 1500);
    }
  }

  return (
    <>
      <Head>
        <title>Bem Vindo | Nexus Achievements</title>
        <meta name="description" content="Crie o seu nickname único no Nexus Achievements para começar a sincronizar os seus troféus e participar da comunidade de caçadores de troféus." />
      </Head>
      <div className="flex w-full min-h-[calc(100vh-10rem)] md:min-h-[calc(100vh-12rem)] items-center justify-center relative overflow-hidden rounded-3xl">
        <ToastContainer />

        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-md space-y-6 rounded-3xl bg-surface/80 backdrop-blur-xl p-8 sm:p-10 shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-primary/30 relative z-10 animate-in zoom-in-95 duration-500">

          <div className="text-center">
            <span className="text-5xl block mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]">🎮</span>
            <h2 className="text-2xl font-black tracking-tight text-white">Crie a sua Identidade</h2>
            <p className="mt-2 text-sm text-gray-400 font-medium">
              Notámos que o seu nome da conta conectada contém espaços ou é inválido. Escolha o seu <strong className="text-white">Nickname Único</strong> para a plataforma.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="nickname" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                O seu Gamer Tag
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500 font-bold">@</span>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="Ex: MarceloAmp"
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3.5 text-white font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
                  required
                  minLength={3}
                  maxLength={20}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-2">Apenas letras, números e underlines (_). Sem espaços.</p>
            </div>

            <button
              type="submit"
              disabled={loading || nickname.length < 3}
              className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] text-sm font-black text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
            >
              {loading ? 'A processar...' : 'Confirmar e Entrar'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}