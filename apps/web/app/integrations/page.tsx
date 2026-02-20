import React from "react";
import { createClient } from "@/utils/supabase/server";
import { linkPlatform, unlinkPlatform } from "./actions";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Dicionário para guardar as contas que o utilizador já tem vinculadas
  const userAccounts: Record<string, string> = {};

  if (user) {
    const { data } = await supabase
      .from("linked_accounts")
      .select("platform, platform_user_id")
      .eq("user_id", user.id);
      
    if (data) {
      data.forEach((acc) => {
        userAccounts[acc.platform] = acc.platform_user_id;
      });
    }
  }

  // Base das Plataformas
  const platformsBase = [
    {
      id: "steam",
      name: "Steam",
      description: "Insira a sua SteamID de 17 dígitos. O seu perfil Steam deve estar definido como público.",
      color: "bg-[#171a21]",
      borderHighlight: "hover:border-[#66c0f4]",
      textColor: "text-[#66c0f4]",
      icon: "💨",
    },
    {
      id: "psn",
      name: "PlayStation Network",
      description: "Insira a sua PSN ID. Apenas troféus sincronizados publicamente serão capturados.",
      color: "bg-[#003087]",
      borderHighlight: "hover:border-[#0070d1]",
      textColor: "text-[#0070d1]",
      icon: "🎮",
    },
    {
      id: "xbox",
      name: "Xbox Live",
      description: "Insira a sua Gamertag exata. Inclua os números finais se existirem.",
      color: "bg-[#107C10]",
      borderHighlight: "hover:border-[#9bf00b]",
      textColor: "text-[#9bf00b]",
      icon: "❎",
    },
    {
      id: "epic",
      name: "Epic Games",
      description: "Conecte a sua conta Epic para sincronizar jogos que suportem o novo sistema de conquistas.",
      color: "bg-[#313131]",
      borderHighlight: "hover:border-white",
      textColor: "text-white",
      icon: "⬛",
    },
  ];

  // Mescla a base visual com os dados reais do banco de dados
  const platforms = platformsBase.map(plat => ({
    ...plat,
    isConnected: !!userAccounts[plat.id],
    currentValue: userAccounts[plat.id] || "",
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 max-w-4xl">
      
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">🔗 Integrações</h2>
        <p className="text-gray-400 mt-1">
          Vincule as suas contas de jogos para o Nexus começar a sincronizar as suas conquistas automaticamente.
        </p>
      </div>

      <div className="space-y-6">
        {platforms.map((platform) => (
          <div 
            key={platform.id} 
            className={`bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-300 ${platform.borderHighlight} group`}
          >
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
              
              <div className="flex items-center gap-4 md:w-1/3 shrink-0">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-inner ${platform.color}`}>
                  {platform.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{platform.name}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${platform.isConnected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                    {platform.isConnected ? "Conectado" : "Não Conectado"}
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full">
                <p className="text-sm text-gray-400 mb-3">
                  {platform.description}
                </p>
                
                {platform.isConnected ? (
                  /* FORMULÁRIO DE DESCONECTAR */
                  <form action={unlinkPlatform} className="flex items-center gap-3">
                    {/* Alterado de value para defaultValue */}
                    <input type="hidden" name="platform" defaultValue={platform.id} />
                    <input 
                      type="text" 
                      disabled 
                      // Alterado de value para defaultValue
                      defaultValue={platform.currentValue}
                      className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-gray-500 text-sm opacity-70 cursor-not-allowed"
                    />
                    <button type="submit" className="px-4 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm font-medium transition-colors">
                      Desconectar
                    </button>
                  </form>
                ) : (
                  /* FORMULÁRIO DE CONECTAR */
                  <form action={linkPlatform} className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Alterado de value para defaultValue */}
                    <input type="hidden" name="platform" defaultValue={platform.id} />
                    <input 
                      type="text" 
                      name="platformId"
                      required
                      placeholder={`Inserir ID da ${platform.name}`}
                      className="flex-1 w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-600"
                    />
                    <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-white text-black hover:bg-gray-200 rounded-lg text-sm font-bold transition-colors">
                      Vincular
                    </button>
                  </form>
                )}
              </div>
              
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}