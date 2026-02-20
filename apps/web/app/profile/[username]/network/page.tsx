import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface NetworkPageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function NetworkPage({ params, searchParams }: NetworkPageProps) {
  const { username } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "following" ? "following" : "followers";

  const supabase = await createClient();

  // 1. Confirma se o perfil existe
  const { data: profile, error } = await supabase
    .from("users")
    .select("id, username, avatar_url")
    .eq("username", username)
    .single();

  if (error || !profile) notFound();

  // 2. Busca os IDs dependendo da aba selecionada
  let userIds: string[] = [];
  
  if (activeTab === "followers") {
    // Quem segue este perfil?
    const { data } = await supabase.from('user_follows').select('follower_id').eq('following_id', profile.id);
    userIds = data?.map(d => d.follower_id) || [];
  } else {
    // Quem este perfil segue?
    const { data } = await supabase.from('user_follows').select('following_id').eq('follower_id', profile.id);
    userIds = data?.map(d => d.following_id) || [];
  }

  // 3. Busca os dados completos desses utilizadores
  let usersList: any[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar_url, global_level, total_platinums, title')
      .in('id', userIds);
    
    usersList = data || [];
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
      
      {/* Cabeçalho */}
      <div className="py-6 border-b border-border flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/profile/${profile.username}`} className="w-16 h-16 rounded-2xl bg-surface border-2 border-border overflow-hidden relative shrink-0 hover:border-primary transition-colors">
            {profile.avatar_url ? (
               <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
               <span className="flex items-center justify-center w-full h-full text-2xl font-bold">{profile.username.charAt(0)}</span>
            )}
          </Link>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Rede de <span className="text-primary">{profile.username}</span></h2>
            <p className="text-gray-400 mt-1">Descubra novos caçadores e faça aliados.</p>
          </div>
        </div>
        <Link href={`/profile/${profile.username}`} className="px-6 py-2.5 bg-surface border border-border text-white hover:bg-surface/80 rounded-lg font-bold text-sm transition-colors shadow-sm">
          Voltar ao Perfil
        </Link>
      </div>

      {/* Abas de Navegação */}
      <div className="flex gap-4 border-b border-border/50 pb-px">
        <Link 
          href={`/profile/${profile.username}/network?tab=followers`}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'followers' ? 'border-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Seguidores
        </Link>
        <Link 
          href={`/profile/${profile.username}/network?tab=following`}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'following' ? 'border-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          A Seguir
        </Link>
      </div>

      {/* Lista de Utilizadores */}
      {usersList.length === 0 ? (
        <div className="bg-surface/30 border border-border border-dashed rounded-3xl p-16 text-center flex flex-col items-center justify-center">
          <span className="text-5xl opacity-50 mb-4">📭</span>
          <p className="text-gray-400 font-medium text-lg">Nenhum caçador encontrado aqui.</p>
          <p className="text-sm text-gray-500 mt-2">
            {activeTab === 'followers' ? 'Este perfil ainda não tem seguidores.' : 'Este perfil ainda não segue ninguém.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {usersList.map((u) => (
            <Link href={`/profile/${u.username}`} key={u.id} className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/50 transition-all group shadow-sm hover:shadow-md">
              <div className="w-14 h-14 rounded-xl bg-background overflow-hidden relative border border-border/50 shrink-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-lg font-bold text-white">{u.username.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate group-hover:text-primary transition-colors">{u.username}</p>
                <p className="text-[10px] text-primary font-bold uppercase mt-0.5 truncate">{u.title || 'Iniciante'}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-gray-400 font-medium">Lvl {u.global_level || 1}</span>
                  <span className="text-xs text-blue-400 font-bold flex items-center gap-1">🏆 {u.total_platinums || 0}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}