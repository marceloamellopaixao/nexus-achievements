import React from "react";

export default function DashboardPage() {
    // Mock de dados: futuramente virá de uma consulta 'count' no Supabase
    const stats = [
        { label: "Jogos Platinados", value: "1.204", icon: "🏆", color: "text-blue-400" },
        { label: "Nexus Coins Geradas", value: "84.5K", icon: "🪙", color: "text-yellow-400" },
        { label: "Caçadores Ativos", value: "342", icon: "🎮", color: "text-primary" },
        { label: "Conquistas Hoje", value: "5.892", icon: "🔥", color: "text-orange-400" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Cabeçalho da Página */}
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Hub Global</h2>
                <p className="text-gray-400 mt-1">
                    Visão geral da comunidade Nexus e atividades em tempo real.
                </p>
            </div>

            {/* Grid de Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-surface/50 border border-border rounded-2xl p-6 flex items-center justify-between hover:border-primary/50 hover:bg-surface transition-all cursor-default group"
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                                {stat.label}
                            </p>
                            <p className="text-3xl font-bold text-white mt-1">
                                {stat.value}
                            </p>
                        </div>
                        <div className={`text-4xl ${stat.color} bg-background p-3 rounded-xl border border-border shadow-inner`}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Placeholder para a próxima etapa (Feed) */}
            <div className="bg-surface/30 border border-border border-dashed rounded-2xl h-64 flex items-center justify-center">
                <p className="text-gray-500 font-medium">O Feed de Atividades será montado aqui...</p>
            </div>

        </div>
    )
}