import { createClient } from "@/utils/supabase/server";
import ChatSidebar from "./ChatSidebar";

interface ChatUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let activeUsers: ChatUser[] = [];
  let archivedUsers: ChatUser[] = [];
  let followingUsers: ChatUser[] = [];
  const unreadCounts: Record<string, number> = {};
  let unreadGlobalCount = 0;

  if (user) {
    // 1. Busca preferências para saber quais canais estão arquivados
    const { data: prefs } = await supabase.from('user_chat_preferences')
      .select('channel_id')
      .eq('user_id', user.id)
      .eq('is_archived', true);
    const archivedChannels = new Set(prefs?.map(p => p.channel_id) || []);

    // 2. Busca canais privados com mensagens recentes
    const { data: recentMsgs } = await supabase.from('chat_messages')
      .select('channel')
      .like('channel', `dm_%${user.id}%`)
      .order('created_at', { ascending: false });

    const activePartnerIds = new Set<string>();
    const archivedPartnerIds = new Set<string>();

    recentMsgs?.forEach(msg => {
      const parts = msg.channel.replace('dm_', '').split('_');
      const partnerId = parts[0] === user.id ? parts[1] : parts[0];
      if (partnerId) {
        if (archivedChannels.has(msg.channel)) {
          archivedPartnerIds.add(partnerId);
        } else {
          activePartnerIds.add(partnerId);
        }
      }
    });

    // Junta todos os IDs para uma busca otimizada no banco
    const allPartnerIds = Array.from(new Set([...activePartnerIds, ...archivedPartnerIds]));

    if (allPartnerIds.length > 0) {
      const { data: usersData } = await supabase.from('users').select('id, username, avatar_url').in('id', allPartnerIds);
      if (usersData) {
         activeUsers = usersData.filter(u => activePartnerIds.has(u.id));
         archivedUsers = usersData.filter(u => archivedPartnerIds.has(u.id));
      }
    }

    // 3. Busca lista de quem o usuário segue para o Modal de Nova Mensagem
    const { data: follows } = await supabase.from('user_follows').select('following_id').eq('follower_id', user.id);
    if (follows && follows.length > 0) {
      const followingIds = follows.map(f => f.following_id);
      const { data: fUsers } = await supabase.from('users').select('id, username, avatar_url').in('id', followingIds);
      followingUsers = (fUsers as ChatUser[]) || [];
    }

    // 4. Contagem de mensagens não lidas
    const { data: unreadData } = await supabase.from('chat_messages').select('channel').like('channel', `dm_%${user.id}%`).eq('is_read', false).neq('user_id', user.id);
    unreadData?.forEach(msg => {
      const parts = msg.channel.replace('dm_', '').split('_');
      const partnerId = parts[0] === user.id ? parts[1] : parts[0];
      unreadCounts[partnerId] = (unreadCounts[partnerId] || 0) + 1;
    });

    const { data: currentUserData } = await supabase.from('users').select('last_global_read').eq('id', user.id).single();
    const lastGlobalRead = currentUserData?.last_global_read || new Date(0).toISOString();
    const { count: globalCount } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('channel', 'global').gt('created_at', lastGlobalRead).neq('user_id', user.id); 
    unreadGlobalCount = globalCount || 0;
  }

  return (
    <div className="flex w-full gap-4 md:gap-6 animate-in fade-in duration-500 relative h-[calc(100dvh-11rem)] md:h-[calc(100vh-9rem)] overflow-hidden">
      <ChatSidebar 
        activeUsers={activeUsers} 
        archivedUsers={archivedUsers}
        followingUsers={followingUsers} 
        unreadCounts={unreadCounts} 
        unreadGlobalCount={unreadGlobalCount} 
      />
      <div className="flex-1 w-full h-full relative min-w-0 flex flex-col">
        <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        {children}
      </div>
    </div>
  )
}