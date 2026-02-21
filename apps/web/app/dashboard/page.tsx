import React from "react";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import AutoSync from "../components/AutoSync";

interface DashboardPageProps {
  searchParams: Promise<{ feed?: string }>;
}

type GlobalActivity = {
  id: string;
  user_id: string;
  game_name: string;
  achievement_name: string;
  points_earned: number;
  platform: string;
  created_at: string;
  users: {
    username: string;
    avatar_url: string | null;
  } | null;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { feed } = await searchParams;
  const activeFeed = feed === 'following' ? 'following' : 'global';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Busca os dados do utilizador logado para o Banner
  let currentUserData = null;
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("username, nexus_coins, total_platinums, global_level")
      .eq("id", user.id)
      .single();
    currentUserData = userData;
  }

  // 2. LÓGICA DO FEED (GLOBAL VS SEGUINDO)
  let activities: GlobalActivity[] = [];
  let isFollowingNoOne = false;

  if (activeFeed === 'following' && user) {
    // Busca os IDs das pessoas que este utilizador segue
    const { data: follows } = await supabase.from('user_follows').select('following_id').eq('follower_id', user.id);
    const followingIds = follows?.map(f => f.following_id) || [];

    if (followingIds.length > 0) {
      // Busca a atividade SÓ dessas pessoas
      const { data } = await supabase
        .from("global_activity")
        .select(`id, user_id, game_name, achievement_name, points_earned, platform, created_at, users ( username, avatar_url )`)
        .in('user_id', followingIds)
        .order("created_at", { ascending: false })
        .limit(50);
      
      activities = data as unknown as GlobalActivity[] || [];
    } else {
      isFollowingNoOne = true; // Flag para mostrar mensagem específica
    }
  } else {
    // Busca o Feed Global de todos (Padrão)
    const { data } = await supabase
      .from("global_activity")
      .select(`id, user_id, game_name, achievement_name, points_earned, platform, created_at, users ( username, avatar_url )`)
      .order("created_at", { ascending: false })
      .limit(50);
      
    activities = data as unknown as GlobalActivity[] || [];
  }

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Agora mesmo";
    if (diffInSeconds < 3600) return `Há ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Há ${Math.floor(diffInSeconds / 3600)}h`;
    return `Há ${Math.floor(diffInSeconds / 86400)} dias`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      <AutoSync />
      
      {/* BANNER DE BOAS-VINDAS */}
      {currentUserData && (
        <div className="bg-surface/40 backdrop-blur-md border border-border p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Bem-vindo de volta, <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-purple-500">{currentUserData.username}</span>!
            </h2>
            <p className="text-gray-400 mt-1 text-sm md:text-base">Pronto para a sua próxima caçada?</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none bg-background/60 border border-border px-5 py-3 rounded-2xl text-center shadow-inner">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Moedas</span>
              <span className="text-xl font-black text-yellow-500 flex items-center justify-center gap-1">🪙 {currentUserData.nexus_coins?.toLocaleString()}</span>
            </div>
            <div className="flex-1 md:flex-none bg-background/60 border border-border px-5 py-3 rounded-2xl text-center shadow-inner">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Platinas</span>
              <span className="text-xl font-black text-blue-400 flex items-center justify-center gap-1">🏆 {currentUserData.total_platinums || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* CABEÇALHO DO FEED E NAVEGAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4 border-b border-border/50 pb-0">
        
        {/* ABAS DO FEED */}
        <div className="flex gap-6">
          <Link 
            href="/dashboard?feed=global" 
            scroll={false}
            className={`pb-4 text-sm font-black uppercase tracking-wider transition-colors flex items-center gap-2 ${activeFeed === 'global' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-300'}`}
          >
            🌐 Feed Global
          </Link>
          <Link 
            href="/dashboard?feed=following" 
            scroll={false}
            className={`pb-4 text-sm font-black uppercase tracking-wider transition-colors flex items-center gap-2 ${activeFeed === 'following' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-300'}`}
          >
            👥 A Seguir
          </Link>
        </div>

        <Link href="/integrations" className="mb-4 px-5 py-2.5 bg-primary/10 text-primary hover:text-white border border-primary/20 hover:bg-primary rounded-xl text-sm font-bold transition-all shadow-sm">
          + Sincronizar Steam
        </Link>
      </div>

      {/* LINHA DO TEMPO (FEED) */}
      <div className="space-y-6 pt-4">
        
        {isFollowingNoOne ? (
          <div className="bg-surface/30 border border-border border-dashed rounded-3xl p-16 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="text-5xl opacity-50 mb-4">👀</span>
            <p className="text-gray-400 font-medium text-lg">Ainda não segue ninguém.</p>
            <p className="text-sm text-gray-500 mt-2 mb-6">Explore o Feed Global ou o Hall da Fama para encontrar novos aliados!</p>
            <Link href="/leaderboards" className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/80 transition-colors">
              Explorar Hall da Fama
            </Link>
          </div>
        ) : !activities || activities.length === 0 ? (
          <div className="bg-surface/30 border border-border border-dashed rounded-3xl p-16 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="text-5xl opacity-50 mb-4">📭</span>
            <p className="text-gray-400 font-medium text-lg">O feed está muito silencioso...</p>
            <p className="text-sm text-gray-500 mt-1">Nenhuma atividade recente encontrada.</p>
          </div>
        ) : (
          <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-linear-to-b before:from-primary/50 before:via-border before:to-transparent">
            
            {activities.map((activity) => {
              const activityUser = activity.users;
              if (!activityUser) return null;

              const isPlatinum = activity.achievement_name.toLowerCase().includes('platinou');
              const cardGlowClass = isPlatinum 
                ? 'border-yellow-500/50 bg-linear-to-br from-surface to-yellow-900/10 shadow-[0_0_20px_rgba(234,179,8,0.1)]' 
                : 'border-border/50 bg-surface/50 hover:border-primary/50 shadow-md';

              return (
                <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">
                  
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg transition-transform group-hover:scale-110 ${isPlatinum ? 'bg-yellow-500 text-black' : 'bg-surface text-primary'}`}>
                    <span className="font-black text-sm drop-shadow-md">
                      {isPlatinum ? '👑' : (activity.platform === 'Steam' ? '🎮' : '🏆')}
                    </span>
                  </div>
                  
                  <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] backdrop-blur-sm border p-5 rounded-3xl transition-all duration-300 ${cardGlowClass}`}>
                    
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                      <Link href={`/profile/${activityUser.username}`} className="flex items-center gap-3 group/link">
                        <div className="w-10 h-10 rounded-full bg-background overflow-hidden relative border border-border group-hover/link:border-primary transition-colors">
                          {activityUser.avatar_url ? (
                            <Image src={activityUser.avatar_url} alt={activityUser.username} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold uppercase text-gray-400">
                              {activityUser.username.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm group-hover/link:text-primary transition-colors">
                            {activityUser.username}
                          </p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            {timeAgo(activity.created_at)}
                          </p>
                        </div>
                      </Link>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{activity.game_name}</p>
                      <h4 className={`text-lg md:text-xl font-black leading-tight ${isPlatinum ? 'text-transparent bg-clip-text bg-linear-to-r from-yellow-400 to-yellow-600' : 'text-white'}`}>
                        {activity.achievement_name}
                      </h4>
                    </div>

                    <div className="mt-5 flex items-center gap-2 bg-green-500/10 w-fit px-3 py-1.5 rounded-xl border border-green-500/20">
                      <span className="text-yellow-500 text-sm drop-shadow-md">🪙</span>
                      <span className="text-green-400 font-bold text-xs uppercase tracking-wide">
                        +{activity.points_earned} Nexus Coins
                      </span>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}