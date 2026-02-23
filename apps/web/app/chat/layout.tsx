import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { FaGlobeAmericas, FaUserFriends } from "react-icons/fa";

interface FollowingUser { id: string; username: string; avatar_url: string | null; }

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let followingUsers: FollowingUser[] = [];
  const unreadCounts: Record<string, number> = {};
  let unreadGlobalCount = 0;

  if (user) {
    const { data: follows } = await supabase.from('user_follows').select('following_id').eq('follower_id', user.id);
    const followingIds = follows?.map(f => f.following_id) || [];

    if (followingIds.length > 0) {
      const { data: usersData } = await supabase.from('users').select('id, username, avatar_url').in('id', followingIds);
      followingUsers = (usersData as FollowingUser[]) || [];
    }

    const { data: unreadData } = await supabase.from('chat_messages').select('user_id').like('channel', `%${user.id}%`).eq('is_read', false).neq('user_id', user.id);
    if (unreadData) {
      unreadData.forEach(msg => { unreadCounts[msg.user_id] = (unreadCounts[msg.user_id] || 0) + 1; });
    }

    const { data: currentUserData } = await supabase.from('users').select('last_global_read').eq('id', user.id).single();
    const lastGlobalRead = currentUserData?.last_global_read || new Date(0).toISOString();

    const { count: globalCount } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('channel', 'global').gt('created_at', lastGlobalRead).neq('user_id', user.id); 
    unreadGlobalCount = globalCount || 0;
  }

  return (
    <div className="flex w-full gap-4 md:gap-6 animate-in fade-in duration-500 relative h-[calc(100dvh-11rem)] md:h-[calc(100vh-9rem)] md:pb-10">
      
      <input type="checkbox" id="mobile-sidebar" className="peer hidden" />
      <label htmlFor="mobile-sidebar" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 opacity-0 pointer-events-none peer-checked:opacity-100 peer-checked:pointer-events-auto md:hidden transition-opacity duration-300"></label>

      <div className="fixed md:relative z-50 inset-y-0 left-0 w-72 md:w-80 transform -translate-x-full peer-checked:translate-x-0 md:translate-x-0 transition-transform duration-300 ease-out bg-surface/95 md:bg-surface/40 backdrop-blur-3xl border-r md:border border-white/10 md:rounded-4xl p-5 flex flex-col shadow-2xl h-full shrink-0">
        <div className="flex items-center justify-between mb-6 px-1 shrink-0">
          <h2 className="font-black text-white text-xl tracking-tight">Mensagens</h2>
          <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-lg border border-primary/20 uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span> Live
          </span>
        </div>

        <Link href="/chat" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-primary/10 transition-all mb-6 border border-white/5 bg-background/50 group active:scale-95 shrink-0">
          <div className="relative shrink-0">
            <div className="w-11 h-11 bg-primary/20 rounded-xl flex items-center justify-center text-xl shadow-inner border border-primary/20 group-hover:scale-105 transition-transform text-primary"><FaGlobeAmericas /></div>
            {unreadGlobalCount > 0 && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-surface rounded-full animate-pulse z-10 shadow-sm"></div>}
          </div>
          <div className="flex-1">
            <div className="font-black text-white text-sm">Chat Global</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Sala da Comunidade</div>
          </div>
          {unreadGlobalCount > 0 && <div className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.5)]">{unreadGlobalCount > 99 ? '99+' : unreadGlobalCount}</div>}
        </Link>

        <div className="flex items-center gap-2 mb-4 px-1 opacity-70 shrink-0">
          <FaUserFriends className="text-gray-400 text-sm" />
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Amigos Online</h3>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2 min-h-0">
          {followingUsers.length === 0 ? (
            <div className="bg-background/30 border border-dashed border-white/10 rounded-2xl p-6 text-center">
              <p className="text-xs text-gray-500 font-medium leading-relaxed">Siga outros caçadores para iniciar chats privados.</p>
            </div>
          ) : (
            followingUsers.map(u => {
              const unread = unreadCounts[u.id] || 0;
              return (
                <Link key={u.id} href={`/chat/${u.username}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface/80 hover:border-primary/30 transition-all border border-transparent group active:scale-95">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-background border border-white/10 relative shadow-md group-hover:border-primary/50 transition-colors">
                      {u.avatar_url ? <Image src={u.avatar_url} fill className="object-cover group-hover:scale-110 transition-transform" alt="" unoptimized /> : <span className="flex items-center justify-center w-full h-full font-black text-primary bg-primary/5 text-xs">{u.username.charAt(0).toUpperCase()}</span>}
                    </div>
                    {unread > 0 && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-surface rounded-full animate-pulse z-10 shadow-sm"></div>}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-gray-300 text-sm truncate group-hover:text-white transition-colors">{u.username}</span>
                    <span className="text-[9px] text-primary font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 absolute mt-5">Mensagem Direta</span>
                  </div>
                  {unread > 0 && <div className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.5)]">{unread}</div>}
                </Link>
              )
            })
          )}
        </div>
      </div>

      <div className="flex-1 w-full h-full relative min-w-0 flex flex-col">
        <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        {children}
      </div>
    </div>
  )
}