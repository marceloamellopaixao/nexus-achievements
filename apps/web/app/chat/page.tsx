import { createClient } from "@/utils/supabase/server";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: messagesData } = await supabase
    .from('chat_messages')
    .select('id, content, created_at, user_id, users(username, avatar_url)')
    .eq('channel', 'global')
    .order('created_at', { ascending: false })
    .limit(50);

  const initialMessages = (messagesData as any[] || []).map(m => ({
    ...m,
    users: Array.isArray(m.users) ? m.users[0] : m.users
  })).reverse();

  return <ChatClient initialMessages={initialMessages} currentUserId={user?.id} channelId="global" />;
}