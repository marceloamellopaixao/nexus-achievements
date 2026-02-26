import { createClient } from "@/utils/supabase/server";
import ChatClient from "./ChatClient";
import { Metadata } from "next";
import { FaGlobeAmericas } from "react-icons/fa";

export const metadata: Metadata = {
  title: "Chat Global | Nexus Achievements",
  description: "Participe do chat global do Nexus Achievements e converse com outros membros da comunidade em tempo real.",
}

interface ChatUser { username: string; avatar_url: string | null; }
interface RawChatMessage { id: string; content: string; created_at: string; user_id: string; users: ChatUser | ChatUser[] | null; }

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verifica se é Admin
  let isAdmin = false;
  if (user) {
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
    isAdmin = userData?.role === 'admin';
  }

  const { data: messagesData } = await supabase
    .from('chat_messages')
    .select('id, content, created_at, user_id, users(username, avatar_url)')
    .eq('channel', 'global')
    .order('created_at', { ascending: false })
    .limit(50);

  const initialMessages = ((messagesData as unknown as RawChatMessage[]) || []).map(m => {
    const userData = Array.isArray(m.users) ? m.users[0] : m.users;
    return { id: m.id, content: m.content, created_at: m.created_at, user_id: m.user_id, users: userData || null };
  }).reverse();

  return (
    <ChatClient 
      initialMessages={initialMessages} 
      currentUserId={user?.id} 
      channelId="global" 
      icon={<FaGlobeAmericas className="text-primary" />}
      isAdmin={isAdmin}
    />
  );
}