import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import { ToastContainer } from "react-toastify";
import { DesktopNavLinks, MobileNavLinks } from "./components/NavLinks"; // <-- Importamos os novos botões

export const metadata: Metadata = {
  title: "Nexus Achievements",
  description: "O seu hub definitivo de conquistas gamer e networking.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userData = null;

  if (user) {
    const { data } = await supabase
      .from("users")
      .select("username, avatar_url, nexus_coins")
      .eq("id", user.id)
      .single();

    userData = data;
  }

  const navLinks = [
    { href: "/dashboard", icon: "🏠", label: "Início", mobile: true },
    { href: "/games", icon: "🎮", label: "Jogos", mobile: true },
    { href: "/leaderboards", icon: "🏆", label: "Hall da Fama", mobile: true },
    { href: "/chat", icon: "💬", label: "Taverna", mobile: true },
    { href: userData?.username ? `/profile/${userData.username}` : "/dashboard", icon: "👤", label: "Meu Perfil", mobile: true },
    { href: "/shop", icon: "🛒", label: "Loja", mobile: true },
    { href: "/integrations", icon: "⚙️", label: "Integrações", mobile: false }, 
  ];

  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased flex h-screen overflow-hidden bg-background text-foreground selection:bg-primary/30">
        
        {/* =========================================
            DESKTOP SIDEBAR
            ========================================= */}
        <aside className="w-64 xl:w-72 border-r border-border/50 bg-surface/30 backdrop-blur-xl hidden md:flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-50">
          <div className="h-20 flex items-center px-8 border-b border-border/50">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-primary to-purple-500 italic tracking-tighter">
                NEXUS
              </h1>
            </Link>
          </div>
          
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
            <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-4">Menu Principal</p>
            
            {/* Aqui usamos o Componente Inteligente de Desktop */}
            <DesktopNavLinks links={navLinks} />

          </nav>

          {userData && (
            <div className="p-4 border-t border-border/50 bg-background/20 m-4 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-surface border border-primary overflow-hidden relative shrink-0">
                  {userData.avatar_url ? (
                    <Image src={userData.avatar_url} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full font-bold text-primary">{userData.username.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">{userData.username}</p>
                  <p className="text-xs text-primary font-medium truncate">Lvl Mestre</p>
                </div>
              </div>
              <form action="/auth/signout" method="post">
                <button type="submit" className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-colors border border-red-500/20">
                  Encerrar Sessão
                </button>
              </form>
            </div>
          )}
        </aside>

        {/* =========================================
            ÁREA DE CONTEÚDO PRINCIPAL
            ========================================= */}
        <div className="flex-1 flex flex-col h-screen relative w-full max-w-full">
          
          {/* TOP HEADER */}
          <header className="h-16 md:h-20 shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 z-40 sticky top-0">
            
            <div className="flex items-center gap-2">              
              <Link href="/dashboard" className="flex items-center gap-2">
                
                <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-primary to-purple-500 italic tracking-tighter">
                  NEXUS
                </h1>
              </Link>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {userData ? (
                <>
                  <div className="flex items-center gap-1.5 md:gap-2 bg-yellow-500/10 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)] cursor-default">
                    <span className="text-yellow-500 text-xs md:text-sm animate-pulse">🪙</span>
                    <span className="text-xs md:text-sm font-black text-yellow-500">{userData.nexus_coins.toLocaleString()}</span>
                  </div>
                  
                  <Link href={`/profile/${userData.username}`} className="md:hidden w-8 h-8 rounded-full border border-primary overflow-hidden relative">
                    {userData.avatar_url ? (
                      <Image src={userData.avatar_url} alt="Avatar" fill className="object-cover" />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full font-bold text-white text-xs bg-surface">{userData.username.charAt(0)}</span>
                    )}
                  </Link>
                </>
              ) : (
                <Link href="/login" className="px-5 py-2 md:py-2.5 bg-primary text-white rounded-xl text-xs md:text-sm font-black hover:bg-primary/80 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  Entrar
                </Link>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-background/50 p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
            <ToastContainer closeOnClick pauseOnHover draggable theme="dark" position="bottom-right" />
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>

          {/* =========================================
              MOBILE BOTTOM NAVIGATION
              ========================================= */}
          {userData && (
            <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-surface/90 backdrop-blur-2xl border-t border-border/50 flex items-center justify-around z-50 px-2 pb-safe">
              
              {/* Aqui usamos o Componente Inteligente Mobile */}
              <MobileNavLinks links={navLinks} />

            </nav>
          )}

        </div>
      </body>
    </html>
  );
}