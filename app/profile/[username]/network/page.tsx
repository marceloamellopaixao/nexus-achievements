import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rede de Amigos | Nexus Achievements",
  description: "Explore a rede de amigos do perfil do Nexus Achievements, veja quem são os seguidores e as pessoas que este usuário segue. Conecte-se com outros caçadores de troféus, descubra novos perfis interessantes e fortaleça sua presença na comunidade de gamers.",
}

interface NetworkPageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}

interface NetworkUser {
  id: string;
  username: string;
  avatar_url: string | null;
  global_level: number;
  total_platinums: number;
  title: string | null;
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

  // 2. Busca os IDs dependendo da aba
  let userIds: string[] = [];
  
  if (activeTab === "followers") {
    const { data } = await supabase.from('user_follows').select('follower_id').eq('following_id', profile.id);
    userIds = data?.map(d => d.follower_id) || [];
  } else {
    const { data } = await supabase.from('user_follows').select('following_id').eq('follower_id', profile.id);
    userIds = data?.map(d => d.following_id) || [];
  }

  // 3. Busca os dados completos dos utilizadores
  let usersList: NetworkUser[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar_url, global_level, total_platinums, title')
      .in('id', userIds);
    
    usersList = data || [];
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20 px-4 md:px-0">
      
      {/* =========================================
          CABEÇALHO DA REDE
          ========================================= */}
      <div className="py-8 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Link href={`/profile/${profile.username}`} className="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-surface border-2 border-border/50 overflow-hidden shrink-0 hover:border-primary transition-all duration-300 shadow-2xl group">
            {profile.avatar_url ? (
               <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover group-hover:scale-110 transition-transform" unoptimized />
            ) : (
               <span className="flex items-center justify-center w-full h-full text-3xl font-black text-white bg-primary/20">{profile.username.charAt(0)}</span>
            )}
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Rede de <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-purple-500">{profile.username}</span>
            </h1>
            <p className="text-gray-400 mt-1 font-medium">Aliados e seguidores na jornada pelas platinas.</p>
          </div>
        </div>
        <Link href={`/profile/${profile.username}`} className="px-6 py-3 bg-surface/80 backdrop-blur-md border border-border text-white hover:bg-white/5 rounded-xl font-black text-sm transition-all shadow-sm flex items-center justify-center gap-2">
          Voltar ao Perfil
        </Link>
      </div>

      {/* =========================================
          ABAS DE NAVEGAÇÃO MODERNAS
          ========================================= */}
      <div className="flex gap-8 border-b border-border/50 pb-0">
        <Link 
          href={`/profile/${profile.username}/network?tab=followers`}
          scroll={false}
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'followers' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
        >
          {activeTab === 'followers' && <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>}
          Seguidores ({activeTab === 'followers' ? usersList.length : '...'})
        </Link>
        <Link 
          href={`/profile/${profile.username}/network?tab=following`}
          scroll={false}
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'following' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
        >
          {activeTab === 'following' && <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>}
          Seguindo ({activeTab === 'following' ? usersList.length : '...'})
        </Link>
      </div>

      {/* =========================================
          LISTA DE UTILIZADORES EM GRID
          ========================================= */}
      {usersList.length === 0 ? (
        <div className="bg-surface/30 border border-border border-dashed rounded-4xl p-20 text-center flex flex-col items-center justify-center shadow-inner">
          <span className="text-6xl opacity-30 mb-4 grayscale">👥</span>
          <h3 className="text-xl font-bold text-gray-400">Nenhum caçador por aqui...</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-xs">
            {activeTab === 'followers' ? 'Este perfil ainda não tem seguidores. Que tal ser o primeiro?' : 'Este perfil ainda não começou a seguir outros aventureiros.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {usersList.map((u) => (
            <Link 
              href={`/profile/${u.username}`} 
              key={u.id} 
              className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-3xl p-5 flex items-center gap-5 hover:border-primary/50 hover:bg-surface/80 transition-all group shadow-sm hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1"
            >
              {/* Avatar do Usuário na Lista */}
              <div className="w-16 h-16 rounded-2xl bg-background overflow-hidden relative border border-border/50 shrink-0 shadow-lg group-hover:border-primary/50 transition-colors">
                {u.avatar_url ? (
                  <Image src={u.avatar_url} alt={u.username} fill sizes="64px" className="object-cover group-hover:scale-110 transition-transform duration-500" unoptimized />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-xl font-black text-white bg-surface">{u.username.charAt(0)}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-lg truncate group-hover:text-primary transition-colors">
                  {u.username}
                </p>
                <p className="text-[10px] text-primary font-black uppercase tracking-tighter mt-0.5 truncate bg-primary/10 w-fit px-2 py-0.5 rounded border border-primary/20">
                  {u.title || 'Iniciante'}
                </p>
                
                <div className="flex items-center gap-4 mt-3 pt-2 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">Nível</span>
                    <span className="text-sm font-black text-gray-300">{u.global_level || 1}</span>
                  </div>
                  <div className="w-px h-6 bg-border/50"></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">Platinas</span>
                    <span className="text-sm font-black text-blue-400">🏆 {u.total_platinums || 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Seta indicativa discreta */}
              <div className="text-gray-600 group-hover:text-primary transition-colors pr-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}