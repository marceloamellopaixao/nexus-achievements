import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AdminClientPage from "./AdminClientPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administração | Nexus Achievements",
  description: "Acesse o painel de administração do Nexus Achievements para gerenciar usuários, guias e monitorar o estado do sistema.",
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== 'admin') redirect("/social");

  // Estatísticas Rápidas
  const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { count: totalGuides } = await supabase.from('game_guides').select('*', { count: 'exact', head: true });

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 space-y-12 animate-in fade-in duration-700">

      {/* HEADER REDESENHADO COM GLOW */}
      <div className="relative overflow-hidden rounded-[3rem] bg-surface/30 border border-white/5 p-8 md:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-linear-to-r from-red-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-500/10 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10 text-center md:text-left">
          <div className="w-20 h-20 bg-linear-to-br from-red-500/20 to-red-900/20 text-red-500 rounded-3xl flex items-center justify-center text-4xl border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)] shrink-0">
            🛡️
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase drop-shadow-md">
              Painel de <span className="text-transparent bg-clip-text bg-linear-to-r from-red-400 to-red-600">Controle</span>
            </h1>
            <p className="text-gray-400 font-medium mt-2 text-sm md:text-base max-w-xl">
              Gestão suprema do ecossistema Nexus. O destino da comunidade está em suas mãos.
            </p>
          </div>
        </div>
      </div>

      {/* ESTATÍSTICAS GAMIFICADAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface/40 p-8 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute top-4 right-4 text-5xl opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-500">👥</div>
          <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.2em] mb-2">População Total</p>
          <p className="text-4xl font-black text-white">{totalUsers} <span className="text-sm font-bold text-gray-500">Caçadores</span></p>
        </div>

        <div className="bg-surface/40 p-8 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group hover:border-purple-500/30 transition-colors">
          <div className="absolute top-4 right-4 text-5xl opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-500">📚</div>
          <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.2em] mb-2">Biblioteca</p>
          <p className="text-4xl font-black text-white">{totalGuides} <span className="text-sm font-bold text-gray-500">Guias</span></p>
        </div>

        <div className="bg-red-500/5 p-8 rounded-[2rem] border-2 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)] relative overflow-hidden">
          <div className="absolute top-4 right-4 text-5xl opacity-10">⚡</div>
          <p className="text-red-500/80 text-[11px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            Estado do Sistema
          </p>
          <p className="text-4xl font-black text-red-400 tracking-tight">Operacional</p>
        </div>
      </div>

      {/* CHAMA O COMPONENTE CLIENTE */}
      <AdminClientPage />

    </div>
  );
}