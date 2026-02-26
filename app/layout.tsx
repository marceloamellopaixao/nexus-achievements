import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import { ToastContainer } from "react-toastify";
import { DesktopNavLinks, MobileNavLinks } from "./components/NavLinks";
import NotificationBell from "./components/NotificationBell";
import HeaderTitle from "./components/HeaderTitle";
import AnnouncementBanner from "./components/AnnouncementBanner";
import OnlineUsers from "./components/OnlineUsers";
import { RiAdminFill } from "react-icons/ri";
import { CgProfile } from "react-icons/cg";
import { FaShop } from "react-icons/fa6";
import { IoChatbubbleEllipses, IoGameController, IoSettings } from "react-icons/io5";
import { FaTrophy } from "react-icons/fa";
import { TbWorld } from "react-icons/tb";
import { BiSolidCoinStack } from "react-icons/bi";
import CustomCursor from "./components/CustomCursor";

// 🔥 Importações do Modo Streamer
import { FocusModeProvider } from "./contexts/FocusModeContext";
import FocusModeToggle from "./components/FocusModeToggle";

export const metadata: Metadata = {
  title: 'Nexus Achievements | Sua Jornada Gamer',
  description: 'A plataforma definitiva para caçadores de conquistas da Steam.',
};

interface UserData {
  id: string;
  username: string;
  avatar_url: string | null;
  nexus_coins: number;
  role: string;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userData: UserData | null = null;
  let totalUnreadDMs = 0;

  if (user) {
    const { data } = await supabase.from("users").select("id, username, avatar_url, nexus_coins, role").eq("id", user.id).maybeSingle();
    if (data) userData = data as UserData;

    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .like('channel', `%${user.id}%`)
      .eq('is_read', false)
      .neq('user_id', user.id);

    totalUnreadDMs = count || 0;
  }

  const { data: announcement } = await supabase.from('system_announcements').select('*').eq('is_active', true).maybeSingle();

  const navLinks = [
    { href: "/social", icon: <TbWorld />, label: "Comunidade", mobile: true },
    { href: "/games", icon: <IoGameController />, label: "Jogos", mobile: true },
    { href: "/leaderboards", icon: <FaTrophy />, label: "Hall da Fama", mobile: true },
    { href: "/chat", icon: <IoChatbubbleEllipses />, label: totalUnreadDMs > 0 ? `Chat (${totalUnreadDMs})` : "Chat", mobile: true },
    { href: userData?.username ? `/profile/${userData.username}` : "/login", icon: <CgProfile />, label: "Meu Perfil", mobile: true },
    { href: "/shop", icon: <FaShop />, label: "Loja", mobile: true },
    { href: "/integrations", icon: <IoSettings />, label: "Integrações", mobile: true },
  ];

  if (userData?.role === 'admin') {
    navLinks.push({ href: "/admin", icon: <RiAdminFill />, label: "Painel Admin", mobile: true });
  }

  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased flex h-screen overflow-hidden bg-background text-foreground">
        <CustomCursor />
        
        {/* 🔥 Provider do Modo Foco em volta de tudo! */}
        <FocusModeProvider>
          <aside className="w-64 xl:w-72 border-r border-border/50 bg-surface/30 backdrop-blur-xl hidden lg:flex flex-col z-50 shrink-0">
            <div className="h-20 flex items-center px-8 border-b border-border/50 shrink-0">
              <Link href="/social" className="flex items-center gap-2 group text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-primary to-purple-500 italic tracking-tighter">
                NEXUS
              </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
              <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-4">Menu Principal</p>
              <DesktopNavLinks links={navLinks} />
            </nav>

            {userData && (
              <div className="p-4 border-t border-border/50 bg-background/20 m-4 rounded-2xl shrink-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-surface border border-primary overflow-hidden shrink-0 relative">
                    {userData.avatar_url ? (
                      <Image src={userData.avatar_url} alt="Avatar" fill className="object-cover" unoptimized />
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

          <div className="flex-1 flex flex-col h-screen relative min-w-0 overflow-hidden">
            {announcement && (
              <AnnouncementBanner message={announcement.message} type={announcement.type} />
            )}

            <header className="h-16 md:h-20 shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 z-40">
              <div className="flex items-center gap-2">
                <HeaderTitle links={navLinks} />
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                {userData && (
                  <>
                    {/* 🔥 Toggle do Modo Streamer Inserido Aqui */}
                    <FocusModeToggle />
                    
                    <NotificationBell />
                    <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/30">
                      <span className="text-yellow-500 text-sm"><BiSolidCoinStack /></span>
                      <span className="text-sm font-black text-yellow-500">{userData.nexus_coins.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-background/50 p-4 md:p-6 pb-20 md:pb-6 custom-scrollbar flex flex-col relative">
              <ToastContainer theme="dark" position="bottom-right" />

              <div className="max-w-5xl mx-auto w-full flex-1 h-full flex flex-col relative">
                {children}
              </div>
            </main>

            {userData && (
              <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-surface/90 backdrop-blur-2xl border-t border-border/50 flex items-center justify-around z-50 pb-safe">
                <MobileNavLinks links={navLinks} />
              </nav>
            )}
          </div>

          {userData && (
            <OnlineUsers
              currentUser={{
                user_id: userData.id,
                username: userData.username,
                avatar_url: userData.avatar_url
              }}
            />
          )}
        </FocusModeProvider>
      </body>
    </html>
  );
}