import React from "react";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import AutoSync from "../components/AutoSync";

// 1. Tipagem rigorosa para o Feed
type GlobalActivity = {
  id: string;
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

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("global_activity")
    .select(`
      id,
      game_name,
      achievement_name,
      points_earned,
      platform,
      created_at,
      users (
        username,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  // Forçamos o TypeScript a entender o formato exato que vem do Supabase
  const activities = data as unknown as GlobalActivity[] | null;

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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
      <AutoSync />
      
      {/* Cabeçalho do Dashboard */}
      <div className="py-6 border-b border-border flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">🌐 Feed Global</h2>
          <p className="text-gray-400 mt-1">Acompanhe as conquistas e platinas de todos os caçadores.</p>
        </div>
        <Link href="/integrations" className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-lg text-sm font-bold transition-colors">
          + Sincronizar Conquistas
        </Link>
      </div>

      {/* Linha do Tempo (Feed) */}
      <div className="space-y-6">
        {!activities || activities.length === 0 ? (
          <div className="bg-surface/30 border border-border border-dashed rounded-2xl p-10 text-center">
            <span className="text-4xl opacity-50">📭</span>
            <p className="text-gray-400 font-medium mt-4">O feed está muito silencioso...</p>
            <p className="text-sm text-gray-500 mt-1">Seja o primeiro a sincronizar suas conquistas!</p>
          </div>
        ) : (
          <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-border before:to-transparent">
            
            {/* O map agora não usa 'any', usa o tipo que o TypeScript infere automaticamente do array */}
            {activities.map((activity) => {
              const user = activity.users;
              if (!user) return null;

              return (
                <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">
                  
                  {/* Ponto central da Timeline */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-surface text-xs shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10">
                    <span className="text-primary font-black drop-shadow-md">
                      {activity.platform === 'Steam' ? '🎮' : '🏆'}
                    </span>
                  </div>
                  
                  {/* Card da Atividade */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-surface border border-border p-4 rounded-2xl hover:border-primary/50 transition-colors shadow-lg">
                    
                    <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-3">
                      <Link href={`/profile/${user.username}`} className="flex items-center gap-3 group/link">
                        <div className="w-8 h-8 rounded-full bg-background overflow-hidden relative border border-border">
                          {user.avatar_url ? (
                            <Image src={user.avatar_url} alt={user.username} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold uppercase text-gray-500">
                              {user.username.charAt(0)}
                            </div>
                          )}
                        </div>
                        <p className="font-bold text-white text-sm group-hover/link:text-primary transition-colors">
                          {user.username}
                        </p>
                      </Link>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-background px-2 py-1 rounded-md">
                        {timeAgo(activity.created_at)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-gray-400 font-bold uppercase">{activity.game_name}</p>
                      <h4 className="text-lg font-black text-white leading-tight">
                        {activity.achievement_name}
                      </h4>
                    </div>

                    <div className="mt-4 flex items-center gap-2 bg-green-500/10 w-fit px-3 py-1.5 rounded-lg border border-green-500/20">
                      <span className="text-yellow-500 text-sm">🪙</span>
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