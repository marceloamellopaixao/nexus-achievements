import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AdminClientPage from "./AdminClientPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administração | Nexus Achievements",
  description: "Acesse o painel de administração do Nexus Achievements para gerenciar usuários, guias e monitorar o estado do sistema. Tenha controle total sobre o ecossistema e garanta uma experiência excepcional para a comunidade de jogadores.",
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
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 border-b border-white/5 pb-8">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center text-3xl border border-red-500/20 shadow-lg">🛡️</div>
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Painel de Controle</h1>
          <p className="text-gray-400 font-medium">Gestão suprema do ecossistema Nexus.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface/40 p-6 rounded-3xl border border-border shadow-xl">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">População</p>
          <p className="text-3xl font-black text-white">{totalUsers} Caçadores</p>
        </div>
        <div className="bg-surface/40 p-6 rounded-3xl border border-border shadow-xl">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Biblioteca</p>
          <p className="text-3xl font-black text-white">{totalGuides} Guias Escritos</p>
        </div>
        <div className="bg-red-500/5 p-6 rounded-3xl border border-red-500/20 shadow-xl border-dashed">
          <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-1">Estado do Sistema</p>
          <p className="text-3xl font-black text-red-400 italic">Operacional</p>
        </div>
      </div>

      <AdminClientPage />
    </div>
  );
}