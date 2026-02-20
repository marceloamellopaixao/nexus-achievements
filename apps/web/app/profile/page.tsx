import React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;

  if (user) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  // Formata a data de criação
  const joinDate = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    : 'Desconhecido';

  // Mock da Estante de Troféus (Isto será substituído quando trouxermos a API da Steam/PSN)
  const showcase = [
    { id: 1, title: "Bloodborne", platform: "PSN", gradient: "from-gray-800 to-black", icon: "🩸" },
    { id: 2, title: "Sekiro", platform: "Steam", gradient: "from-orange-900 to-black", icon: "⚔️" },
    { id: 3, title: "Hollow Knight", platform: "Steam", gradient: "from-blue-900 to-black", icon: "🪲" },
    { id: 4, title: "Hades", platform: "Epic", gradient: "from-red-900 to-black", icon: "🔥" },
    { id: 5, title: "Celeste", platform: "Xbox", gradient: "from-purple-900 to-black", icon: "🍓" },
  ];

  if (!profile) return <div className="text-white">Carregando perfil...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto">
      
      {/* HEADER DO PERFIL */}
      <div className="relative bg-surface border border-border rounded-2xl overflow-hidden mt-4 shadow-xl">
        <div className="h-48 md:h-64 bg-linear-to-r from-primary/40 via-purple-900/40 to-background relative border-b border-border shadow-inner">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
        </div>

        <div className="px-6 pb-6 relative flex flex-col md:flex-row md:items-end gap-6 -mt-12 md:-mt-16">
          
          {profile.avatar_url ? (
            <Image 
              src={profile.avatar_url} 
              alt={profile.username} 
              width={128}
              height={128}
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-background shadow-2xl object-cover z-10 shrink-0"
            />
          ) : (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-surface border-4 border-background shadow-2xl flex items-center justify-center text-4xl font-bold text-white z-10 shrink-0">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 space-y-1 mb-2">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              {profile.username}
              <span className="text-xs font-bold bg-primary/20 text-primary border border-primary/50 px-2 py-1 rounded-md uppercase tracking-wider">
                Lvl {profile.global_level}
              </span>
            </h1>
            <p className="text-primary font-medium">{profile.title}</p>
          </div>

          <div className="mb-2">
            {/* O BOTÃO AGORA REDIRECIONA PARA A TELA DE EDIÇÃO */}
            <Link href="/profile/edit" className="inline-block w-full md:w-auto text-center px-6 py-2 bg-white/5 border border-white/10 text-white rounded-lg font-medium hover:bg-white/10 transition-colors shadow-sm">
              Editar Perfil
            </Link>
          </div>
        </div>

        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
          <div className="md:col-span-2">
            <p className="text-gray-300 leading-relaxed text-sm md:text-base">
              &quot;{profile.bio}&quot;
            </p>
            <p className="text-xs text-gray-500 mt-3 font-medium uppercase tracking-wider">
              📅 Membro desde {joinDate}
            </p>
          </div>
          <div className="flex gap-4 md:justify-end items-center">
            <div className="text-center bg-background/50 border border-border px-4 py-2 rounded-xl">
              <p className="text-2xl font-black text-white">{profile.total_games}</p>
              <p className="text-xs text-gray-400 font-medium">Jogos</p>
            </div>
            <div className="text-center bg-background/50 border border-border px-4 py-2 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/10"></div>
              <p className="text-2xl font-black text-blue-400 relative z-10">{profile.total_platinums}</p>
              <p className="text-xs text-gray-400 font-medium relative z-10">Platinas</p>
            </div>
          </div>
        </div>
      </div>

      {/* A ESTANTE DE TROFÉUS PERMANECE AQUI (Pronta para a próxima fase) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🏆 Estante de Troféus
          </h2>
          <span className="text-xs font-medium text-gray-500 bg-surface px-2 py-1 rounded border border-border">
            5 / 5 Slots Usados
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {showcase.map((game) => (
            <div key={game.id} className={`relative aspect-3/4 rounded-xl border border-border/50 bg-linear-to-b ${game.gradient} p-4 flex flex-col justify-between group hover:border-primary transition-all cursor-pointer overflow-hidden shadow-lg`}>
              <div className="absolute top-2 right-2 text-[10px] font-bold text-white/70 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-md border border-white/10">{game.platform}</div>
              <div className="flex-1 flex items-center justify-center"><span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-2xl">{game.icon}</span></div>
              <div className="text-center mt-2 relative z-10">
                <p className="font-bold text-white text-sm truncate drop-shadow-md">{game.title}</p>
                <div className="w-8 h-1 bg-primary/50 mx-auto mt-1 rounded-full group-hover:w-full group-hover:bg-primary transition-all duration-300"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}