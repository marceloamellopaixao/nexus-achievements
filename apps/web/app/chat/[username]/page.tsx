import { createClient } from "@/utils/supabase/server";
import ChatClient from "../ChatClient";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";

interface DmPageProps {
  params: Promise<{ username: string }>;
}

export default async function DirectMessagePage({ params }: DmPageProps) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Busca o utilizador com quem queremos falar
  const { data: targetUser } = await supabase.from('users').select('id, username, avatar_url').eq('username', username).single();
  if (!targetUser) notFound();

  // Se tentar falar com si mesmo, volta para o global
  if (targetUser.id === user.id) redirect('/chat');

  // Lógica para gerar uma string ÚNICA de sala (alfabeticamente para ser sempre igual não importa quem abre o chat)
  const sortedIds = [user.id, targetUser.id].sort();
  const channelId = `dm_${sortedIds[0]}_${sortedIds[1]}`;

  // Busca o histórico do chat privado
  const { data: messagesData } = await supabase
    .from('chat_messages')
    .select('id, content, created_at, user_id, users(username, avatar_url)')
    .eq('channel', channelId)
    .order('created_at', { ascending: false })
    .limit(50);

  const initialMessages = (messagesData as any[] || []).map(m => ({
    ...m,
    users: Array.isArray(m.users) ? m.users[0] : m.users
  })).reverse();

  // Ícone customizado (Foto do utilizador)
  const chatIcon = targetUser.avatar_url ? (
    <div className="w-8 h-8 rounded-full overflow-hidden relative border border-border">
      <Image src={targetUser.avatar_url} alt="Avatar" fill className="object-cover" />
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