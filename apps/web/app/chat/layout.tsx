import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import Image from "next/image";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let followingUsers: any[] = [];
  
  // Busca as pessoas que você segue para listar na barra lateral
  if (user) {
    const { data: follows } = await supabase.from('user_follows').select('following_id').eq('follower_id', user.id);
    const followingIds = follows?.map(f => f.following_id) || [];
    
    if (followingIds.length > 0) {
      const { data: usersData } = await supabase.from('users').select('id, username, avatar_url').in('id', followingIds);
      followingUsers = usersData || [];
    }
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 pb-10 pt-8 px-4 h-[85vh] animate-in fade-in duration-500">
      
      {/* SIDEBAR DE CONTATOS */}
      <div className="w-full md:w-80 bg-surface/50 border border-border rounded-3xl p-4 flex flex-col shadow-2xl shrink-0">
        <h2 className="font-black text-white text-xl mb-4 px-2">Conversas</h2>

        <Link href="/chat" className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/20 transition-colors mb-4 border border-border/50 bg-background/50">
          <span className="text-2xl">🌍</span>
          <div className="font-bold text-white text-sm">Taverna Global</div>
        </Link>

        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Amigos (Seguindo)</h3>
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
          {followingUsers.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 leading-relaxed">Siga outros caçadores para iniciar chats privados com eles.</p>
          ) : (
            followingUsers.map(u => (
              <Link key={u.id} href={`/chat/${u.username}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface hover:border-border/50 transition-all border border-transparent">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-background border border-border relative shrink-0">
                  {u.avatar_url ? <Image src={u.avatar_url} fill className="object-cover" alt="Avatar" /> : <span className="flex items-center justify-center w-full h-full font-bold text-white text-sm">{u.username.charAt(0)}</span>}
                </div>
                <span className="font-bold text-gray-300 text-sm truncate">{u.username}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* ÁREA CENTRAL DO CHAT (onde o global ou o DM vai aparecer) */}
      <div className="flex-1 overflow-hidden h-[60vh] md:h-full">
         {children}
      </div>
    </div>
  )
}