import React from "react";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";

// Definimos o tipo para evitar o erro de 'any'
type LeaderboardTitle = {
  id: string;
  name: string;
  tag_style: string;
};

export default async function LeaderboardsPage() {
  const supabase = await createClient();

  // 1. Busca os Top 20 usuários
  const { data: topUsers } = await supabase
    .from("users")
    .select("id, username, avatar_url, global_level, total_platinums, equipped_title")
    .order("global_level", { ascending: false })
    .order("total_platinums", { ascending: false })
    .limit(20);

  // 2. Busca os títulos para o mapeamento
  const titleIds = topUsers?.map(u => u.equipped_title).filter(Boolean) || [];
  const titlesMap: Record<string, LeaderboardTitle> = {};

  if (titleIds.length > 0) {
    const { data: titles } = await supabase
      .from("shop_items")
      .select("id, name, tag_style")
      .in("id", titleIds);
    
    titles?.forEach(t => {
      titlesMap[t.id] = t as LeaderboardTitle;
    });
  }

  // Se não houver usuários, exibe um estado vazio
  if (!topUsers || topUsers.length === 0) {
    return <div className="p-10 text-center text-gray-500">Nenhum caçador encontrado.</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10 max-w-5xl mx-auto">
      <div className="text-center space-y-2 py-6">
        <h2 className="text-4xl font-black text-white tracking-tighter">HALL DA FAMA</h2>
        <p className="text-gray-400">Os maiores caçadores de conquistas da galáxia Nexus.</p>
      </div>

      {/* Podium (Top 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-12">
        {[1, 0, 2].map((idx) => {
          const user = topUsers[idx];
          if (!user) return null;

          // Configurações visuais baseadas na posição real (0=1º, 1=2º, 2=3º)
          const configs = [
            { pos: 1, height: "h-60", medal: "🥇", border: "border-yellow-500 scale-110", order: "order-1 md:order-2" },
            { pos: 2, height: "h-48", medal: "🥈", border: "border-gray-400", order: "order-2 md:order-1" },
            { pos: 3, height: "h-40", medal: "🥉", border: "border-orange-700", order: "order-3" },
          ];
          const config = configs[idx];
          
          if (!config) return null;

          return (
            <div key={user.id} className={`flex flex-col items-center ${config.order}`}>
              <div className="relative mb-4">
                <div className={`w-20 h-20 rounded-2xl border-2 overflow-hidden shadow-2xl bg-surface ${config.border}`}>
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt={user.username} width={80} height={80} className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold">{user.username[0]}</div>
                  )}
                </div>
                <span className="absolute -top-3 -right-3 text-3xl">{config.medal}</span>
              </div>
              <div className={`w-full bg-surface/50 border border-border rounded-t-2xl flex flex-col items-center justify-center p-4 ${config.height} relative overflow-hidden`}>
                <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-transparent via-primary/50 to-transparent"></div>
                <p className="font-bold text-white text-lg truncate w-full text-center px-2">{user.username}</p>
                <p className="text-primary font-black text-2xl">Lvl {user.global_level || 1}</p>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mt-1">{user.total_platinums} Platinas</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela de Ranking */}
      <div className="bg-surface/30 border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border text-xs uppercase text-gray-500 font-bold">
              <th className="px-6 py-4 w-20 text-center">Pos</th>
              <th className="px-6 py-4">Caçador</th>
              <th className="px-6 py-4 text-center">Nível</th>
              <th className="px-6 py-4 text-center">Platinas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {topUsers.map((user, index) => (
              <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 text-center font-black text-gray-500 group-hover:text-white">
                  #{index + 1}
                </td>
                <td className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-background border border-border overflow-hidden relative">
                    {user.avatar_url && <Image src={user.avatar_url} alt={user.username} fill className="object-cover" />}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{user.username}</p>
                    {user.equipped_title && titlesMap[user.equipped_title] && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${titlesMap[user.equipped_title]?.tag_style}`}>
                        {titlesMap[user.equipped_title]?.name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-sm font-black">
                    Lvl {user.global_level || 1}
                  </span>
                </td>
                <td className="px-6 py-4 text-center font-bold text-blue-400">
                  {user.total_platinums}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}