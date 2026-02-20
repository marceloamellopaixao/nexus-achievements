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

    // Mock dos Jogos em Alta
    const trendingGames = [
        {
            id: 1,
            title: "Elden Ring",
            hunters: "1.2k",
            platforms: ["PC", "PS5", "XBSX"],
            coverGradient: "from-yellow-900 to-black",
        },
        {
            id: 2,
            title: "Helldivers 2",
            hunters: "850",
            platforms: ["PC", "PS5"],
            coverGradient: "from-blue-900 to-black",
        },
        {
            id: 3,
            title: "Final Fantasy VII Rebirth",
            hunters: "620",
            platforms: ["PS5"],
            coverGradient: "from-teal-900 to-black",
        },
        {
            id: 4,
            title: "Hades II",
            hunters: "430",
            platforms: ["PC"],
            coverGradient: "from-orange-900 to-black",
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
                                                &quot;{item.achievement.title}&quot;
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

                {/* Coluna Secundária: Jogos em Alta */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white border-b border-border pb-2 mb-4">
                        Em Alta na Comunidade
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                        {trendingGames.map((game) => (
                            <div
                                key={game.id}
                                className="group relative overflow-hidden rounded-xl border border-border bg-surface flex items-center gap-4 p-3 hover:border-primary/50 cursor-pointer transition-all"
                            >
                                {/* Capa do Jogo (Simulada com Gradiente por enquanto) */}
                                <div className={`w-16 h-20 rounded-md shrink-0 bg-linear-to-b ${game.coverGradient} border border-white/10 shadow-inner flex items-center justify-center`}>
                                    <span className="text-2xl opacity-50">🎮</span>
                                </div>

                                {/* Informações do Jogo */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-bold truncate group-hover:text-primary transition-colors">
                                        {game.title}
                                    </h4>

                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded-sm">
                                            🔥 {game.hunters} platinas
                                        </span>
                                    </div>

                                    {/* Plataformas */}
                                    <div className="flex gap-1 mt-2">
                                        {game.platforms.map((platform, idx) => (
                                            <span key={idx} className="text-[10px] text-gray-400 border border-border bg-background px-1.5 py-0.5 rounded">
                                                {platform}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full py-3 mt-2 text-primary text-sm font-medium hover:text-primary/80 transition-colors">
                        Ver todos os jogos →
                    </button>
                </div>

            </div>

        </div>
    )
}