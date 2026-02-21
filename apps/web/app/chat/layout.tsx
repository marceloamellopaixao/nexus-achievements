import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import Image from "next/image";

// Interface para tipagem estrita dos contatos
interface FollowingUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let followingUsers: FollowingUser[] = [];
  
  // Busca as pessoas que você segue para listar na barra lateral
  if (user) {
    const { data: follows } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id);
      
    const followingIds = follows?.map(f => f.following_id) || [];
    
    if (followingIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .in('id', followingIds);
        
      followingUsers = (usersData as FollowingUser[]) || [];
    }
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 pb-10 pt-8 px-4 h-[85vh] animate-in fade-in duration-500">
      
      {/* SIDEBAR DE CONTATOS */}
      <div className="w-full md:w-80 bg-surface/40 backdrop-blur-xl border border-border/50 rounded-3xl p-5 flex flex-col shadow-2xl shrink-0 overflow-hidden">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="font-black text-white text-xl tracking-tight italic">Mensagens</h2>
          <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-lg border border-primary/20 uppercase tracking-widest">Live</span>
        </div>

        <Link 
          href="/chat" 
          className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-primary/10 transition-all mb-6 border border-border/50 bg-background/40 group active:scale-95"
        >
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-xl shadow-inner border border-primary/20 group-hover:scale-110 transition-transform">
            🌍
          </div>
          <div>
            <div className="font-black text-white text-sm">Taverna Global</div>
            <div className="text-[10px] text-primary font-bold uppercase tracking-tighter">Chat da Comunidade</div>
          </div>
        </Link>

        <div className="flex items-center gap-2 mb-4 px-1">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Amigos Online</h3>
          <div className="h-px bg-border/50 flex-1"></div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
          {followingUsers.length === 0 ? (
            <div className="bg-background/20 border border-dashed border-border/50 rounded-2xl p-6 text-center">
              <p className="text-xs text-gray-500 font-medium leading-relaxed italic">
                Siga outros caçadores para iniciar chats privados.
              </p>
            </div>
          ) : (
            followingUsers.map(u => (
              <Link 
                key={u.id} 
                href={`/chat/${u.username}`} 
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface/80 hover:border-primary/30 transition-all border border-transparent group active:scale-95"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-background border border-border/50 relative shrink-0 shadow-md group-hover:border-primary/50 transition-colors">
                  {u.avatar_url ? (
                    <Image 
                      src={u.avatar_url} 
                      fill 
                      className="object-cover group-hover:scale-110 transition-transform" 
                      alt={`Avatar de ${u.username}`} 
                      unoptimized
                    />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full font-black text-primary bg-primary/5 text-xs">
                      {u.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-gray-200 text-sm truncate group-hover:text-white transition-colors">
                    {u.username}
                  </span>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Ver Perfil</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* ÁREA CENTRAL DO CHAT */}
      <div className="flex-1 overflow-hidden h-[60vh] md:h-full relative">
          <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
          {children}
      </div>
    </div>
  )
}