import Image from "next/image";
import Link from "next/link";
import { Gradient } from "@repo/ui/gradient";

const FEATURES = [
  {
    title: "Sincronização Steam",
    description: "Conecte sua conta e veja suas platinas ganharem vida em um perfil personalizado.",
    icon: "🎮",
  },
  {
    title: "Ranking Global",
    description: "Suba de nível, ganhe Nexus Coins e dispute o topo com caçadores de todo o mundo.",
    icon: "📊",
  },
  {
    title: "Comunidade Ativa",
    description: "Compartilhe guias, deixe recados no mural e encontre parceiros para o 100%.",
    icon: "🤝",
  },
  {
    title: "Loja de Itens",
    description: "Use seus pontos para desbloquear bordas, banners e títulos exclusivos.",
    icon: "💎",
  },
];

export default function Page() {
  return (
    <main className="flex flex-col items-center min-h-screen bg-background overflow-hidden">
      
      {/* =========================================
          HERO SECTION
          ========================================= */}
      <section className="relative w-full flex flex-col items-center justify-center pt-24 pb-32 px-6 overflow-hidden">
        {/* Background Gradients de Impacto */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-30 pointer-events-none z-0">
          <Gradient className="-top-50 w-full h-200" conic />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            A Nova Era das Conquistas
          </div>

          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] drop-shadow-2xl">
            Sua Jornada Gamer <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-purple-400 to-blue-400">
              Transformada em Arte.
            </span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl font-medium leading-relaxed">
            Nexus é a plataforma definitiva para caçadores de troféus. Sincronize suas conquistas, 
            exiba seu progresso e domine o ranking em uma experiência visual premium.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-6">
            <Link 
              href="/login" 
              className="px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)] min-w-50"
            >
              Começar Agora
            </Link>
            <Link 
              href="/leaderboards" 
              className="px-8 py-4 bg-surface/50 backdrop-blur-md border border-border text-white font-black rounded-2xl hover:bg-surface transition-all active:scale-95 min-w-50"
            >
              Ver Ranking
            </Link>
          </div>
        </div>

        {/* Círculos Decorativos do Boilerplate turbinados */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-250 min-h-250 opacity-20 pointer-events-none z-0">
          <Image
            alt="Decoration"
            height={1000}
            src="circles.svg"
            width={1000}
            className="animate-[spin_60s_linear_infinite]"
          />
        </div>
      </section>

      {/* =========================================
          FEATURES SECTION
          ========================================= */}
      <section className="relative z-10 w-full max-w-6xl px-6 pb-40">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, index) => (
            <div 
              key={index} 
              className="group bg-surface/40 backdrop-blur-xl border border-border/50 p-8 rounded-[2.5rem] hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 shadow-xl"
            >
              <div className="w-14 h-14 bg-background border border-border rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-black text-white mb-3 group-hover:text-primary transition-colors italic uppercase tracking-tighter">
                {feature.title}
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          SOCIAL PROOF / MOCKUP SECTION
          ========================================= */}
      <section className="relative w-full max-w-7xl px-6 pb-40 flex flex-col items-center">
        <div className="w-full aspect-video rounded-[3rem] bg-linear-to-b from-surface/80 to-background border border-border shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden flex items-center justify-center group">
          {/* Efeito de brilho de fundo no mockup */}
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          
          <div className="text-center space-y-4">
             <div className="text-7xl drop-shadow-glow animate-bounce">🌌</div>
             <p className="text-primary font-black uppercase tracking-widest text-sm">Dashboard em Tempo Real</p>
             <h2 className="text-3xl text-white font-black tracking-tighter">Estatísticas que inspiram.</h2>
          </div>
          
          {/* Gradiente Overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent"></div>
        </div>
      </section>

      {/* =========================================
          FOOTER DISCRETO
          ========================================= */}
      <footer className="w-full border-t border-border/50 py-12 px-6 flex flex-col md:flex-row items-center justify-between max-w-7xl gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-black text-white italic shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            N
          </div>
          <span className="font-black text-white tracking-widest uppercase text-sm italic">Nexus Achievements</span>
        </div>
        
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
          Desenvolvido para verdadeiros caçadores • 2026
        </p>

        <div className="flex gap-6">
          <a href="#" className="text-gray-400 hover:text-white transition-colors"><span className="sr-only">Steam</span>👾</a>
          <a href="#" className="text-gray-400 hover:text-white transition-colors"><span className="sr-only">Discord</span>💬</a>
          <a href="#" className="text-gray-400 hover:text-white transition-colors"><span className="sr-only">Twitter</span>🐦</a>
        </div>
      </footer>
    </main>
  );
}