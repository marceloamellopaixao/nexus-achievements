import { createClient } from "@/utils/supabase/server";
import ChatClient from "../ChatClient";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";

interface ChatUser {
  username: string;
  avatar_url: string | null;
}

interface RawChatMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users: ChatUser | ChatUser[] | null;
}

interface DmPageProps {
  params: Promise<{ username: string }>;
}

export default async function DirectMessagePage({ params }: DmPageProps) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: targetUser } = await supabase
    .from('users')
    .select('id, username, avatar_url')
    .eq('username', username)
    .single();

  if (!targetUser) notFound();

  if (targetUser.id === user.id) redirect('/chat');

  const sortedIds = [user.id, targetUser.id].sort();
  const channelId = `dm_${sortedIds[0]}_${sortedIds[1]}`;

  const { data: messagesData } = await supabase
    .from('chat_messages')
    .select('id, content, created_at, user_id, users(username, avatar_url)')
    .eq('channel', channelId)
    .order('created_at', { ascending: false })
    .limit(50);

  const initialMessages = ((messagesData as unknown as RawChatMessage[]) || []).map(m => {
    const userData = Array.isArray(m.users) ? m.users[0] : m.users;
    
    return {
      id: m.id,
      content: m.content,
      created_at: m.created_at,
      user_id: m.user_id,
      // Garantimos que retornamos null em vez de undefined caso não exista usuário
      users: userData || null 
    };
  }).reverse();

  // Ícone customizado
  const chatIcon = targetUser.avatar_url ? (
    <div className="relative w-8 h-8 shrink-0 overflow-hidden rounded-full border border-border">
      <Image 
        src={targetUser.avatar_url} 
        alt={targetUser.username} 
        fill 
        className="object-cover" 
        unoptimized 
      />
    </div>
  ) : '💬';

  return (
    <ChatClient 
      initialMessages={initialMessages} 
      currentUserId={user.id} 
      channelId={channelId}
      chatTitle={targetUser.username}
      chatSubtitle="Mensagem Direta Privada"
      icon={chatIcon}
    />
  );
}