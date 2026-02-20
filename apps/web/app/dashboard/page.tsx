import React from "react";

export default function DashboardPage() {
    // Mock de dados: futuramente virá de uma consulta 'count' no Supabase
    const stats = [
        { label: "Jogos Platinados", value: "1.204", icon: "🏆", color: "text-blue-400" },
        { label: "Nexus Coins Geradas", value: "84.5K", icon: "🪙", color: "text-yellow-400" },
        { label: "Caçadores Ativos", value: "342", icon: "🎮", color: "text-primary" },
        { label: "Conquistas Hoje", value: "5.892", icon: "🔥", color: "text-orange-400" },
    ];

    // Mock do Feed de Atividades (Prepara o formato para o futuro Supabase)
    const activities = [
        {
            id: 1,
            user: { name: "ShadowNinja", initial: "S", color: "bg-purple-500" },
            action: "desbloqueou a conquista épica",
            achievement: { title: "No Hit Run", points: 50, rarity: "Ouro" },
            game: "Elden Ring",
            time: "Há 5 minutos",
        },
        {
            id: 2,
            user: { name: "CyberGamer", initial: "C", color: "bg-blue-500" },
            action: "platinou o jogo",
            achievement: { title: "100% Completion", points: 200, rarity: "Platina" },
            game: "Cyberpunk 2077",
            time: "Há 12 minutos",
        },
        {
            id: 3,
            user: { name: "KratosFan", initial: "K", color: "bg-red-500" },
            action: "desbloqueou a conquista",
            achievement: { title: "Primeiro Sangue", points: 10, rarity: "Bronze" },
            game: "God of War Ragnarök",
            time: "Há 45 minutos",
        },
        {
            id: 4,
            user: { name: "PixelHunter", initial: "P", color: "bg-green-500" },
            action: "desbloqueou a conquista rara",
            achievement: { title: "Speedrunner", points: 30, rarity: "Prata" },
            game: "Hollow Knight",
            time: "Há 1 hora",
        },
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

            {/* Feed de Atividades e Sidebar Direita (Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Coluna Principal: Feed */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-bold text-white border-b border-border pb-2 mb-4">
                        Atividades Recentes
                    </h3>

                    <div className="space-y-4">
                        {activities.map((item) => (
                            <div
                                key={item.id}
                                className="bg-surface/30 border border-border rounded-xl p-4 flex gap-4 hover:bg-surface/60 transition-colors"
                            >
                                {/* Avatar do Usuário (Usando Iniciais para não quebrar domínios de imagem) */}
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 ${item.user.color} shadow-sm border border-border`}>
                                    {item.user.initial}
                                </div>

                                {/* Conteúdo da Atividade */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-gray-300">
                                            <span className="font-bold text-white cursor-pointer hover:text-primary transition-colors">
                                                {item.user.name}
                                            </span>{" "}
                                            {item.action}{" "}
                                            <span className="font-semibold text-gray-200">
                                                "{item.achievement.title}"
                                            </span>{" "}
                                            em <span className="text-primary/90 font-medium">{item.game}</span>.
                                        </p>
                                        <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                            {item.time}
                                        </span>
                                    </div>

                                    {/* Badge de Pontuação e Raridade */}
                                    <div className="mt-3 flex gap-2">
                                        <div className="flex items-center gap-1 bg-background border border-border px-2 py-1 rounded-md text-xs font-medium">
                                            <span className="text-yellow-500">🪙</span> +{item.achievement.points}
                                        </div>
                                        <div className="flex items-center bg-background border border-border px-2 py-1 rounded-md text-xs font-medium text-gray-400">
                                            Raridade: <span className="text-white ml-1">{item.achievement.rarity}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full py-3 mt-4 bg-surface border border-border rounded-xl text-gray-400 hover:text-white hover:border-primary/50 transition-all font-medium">
                        Carregar mais atividades
                    </button>
                </div>

                {/* Coluna Secundária: Jogos em Alta (Placeholder por enquanto) */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white border-b border-border pb-2 mb-4">
                        Jogos em Alta
                    </h3>
                    <div className="bg-surface/30 border border-border border-dashed rounded-xl h-64 flex items-center justify-center flex-col text-center p-4">
                        <span className="text-3xl mb-2">🔥</span>
                        <p className="text-gray-500 font-medium text-sm">
                            Os jogos mais platinados da semana aparecerão aqui.
                        </p>
                    </div>
                </div>

            </div>

        </div>
    )
}