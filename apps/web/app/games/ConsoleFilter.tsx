import Link from "next/link";
import { FaTv } from "react-icons/fa";

interface ConsoleFilterProps {
    currentPlatform: string;
    currentConsole: string;
    buildUrl: (updates: Record<string, string | null>) => string;
}

// 🔥 Dicionário Dinâmico: Adicione novos consoles e plataformas aqui sem quebrar o resto do site!
const CONSOLE_MAP: Record<string, { id: string; label: string; theme: string }[]> = {
    PlayStation: [
        { id: 'PS5', label: 'PlayStation 5', theme: 'bg-blue-500/20 border-blue-500/50 text-blue-400' },
        { id: 'PS4', label: 'PlayStation 4 / 3', theme: 'bg-blue-500/20 border-blue-500/50 text-blue-400' },
    ],
    Xbox: [
        { id: 'Series', label: 'Xbox Series X|S', theme: 'bg-green-500/20 border-green-500/50 text-green-400' },
        { id: 'One', label: 'Xbox One / 360', theme: 'bg-green-500/20 border-green-500/50 text-green-400' },
    ],
    Steam: [
        { id: 'PC', label: 'PC (Steam)', theme: 'bg-gray-500/20 border-gray-500/50 text-gray-400' },
        { id: 'Deck', label: 'Steam Deck', theme: 'bg-gray-500/20 border-gray-500/50 text-gray-400' },
    ]
};

export default function ConsoleFilter({ currentPlatform, currentConsole, buildUrl }: ConsoleFilterProps) {
    // Verifica se a plataforma atual tem consoles secundários definidos no mapa
    const availableConsoles = CONSOLE_MAP[currentPlatform];

    // Se não tem (ex: Epic Games, Steam), ele nem renderiza o bloco, economizando espaço!
    if (!availableConsoles || availableConsoles.length === 0) return null;

    return (
        <div className="bg-surface/30 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/5 shadow-inner">
            <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <FaTv /> Console
                </h3>
            </div>
            <div className="flex flex-col gap-2">
                <Link
                    href={buildUrl({ console: null, page: '1' })}
                    className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${!currentConsole ? 'bg-primary/20 border border-primary/50 text-primary shadow-inner' : 'bg-background/50 border border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    Todos
                </Link>

                {availableConsoles.map((cons) => (
                    <Link
                        key={cons.id}
                        href={buildUrl({ console: cons.id, page: '1' })}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${currentConsole === cons.id ? `${cons.theme} shadow-inner` : 'bg-background/50 border border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        {cons.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}