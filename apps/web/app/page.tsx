import Image from "next/image";
import Link from "next/link";
import { Gradient } from "@repo/ui/gradient";
import { FaDiscord, FaSteam } from "react-icons/fa";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nexus Achievements | Sua Jornada Gamer Transformada",
  description: "Plataforma definitiva para caçadores de troféus. Sincronize suas conquistas, exiba seu progresso e domine o ranking em uma experiência visual premium.",
}

const FEATURES = [
  {
    title: "Sincronização Steam",
    description: "Conecte sua conta e veja suas platinas ganharem vida em um perfil totalmente personalizado.",
    icon: "🎮",
    color: "from-blue-500/20 to-blue-500/5",
    border: "group-hover:border-blue-500/50",
  },
  {
    title: "Ranking Global",
    description: "Suba de nível, ganhe Nexus Coins e dispute o topo com caçadores implacáveis de todo o mundo.",
    icon: "🏆",
    color: "from-yellow-500/20 to-yellow-500/5",
    border: "group-hover:border-yellow-500/50",
  },
  {
    title: "Comunidade Ativa",
    description: "Compartilhe guias, deixe recados no mural e encontre parceiros para a platina perfeita.",
    icon: "🌍",
    color: "from-green-500/20 to-green-500/5",
    border: "group-hover:border-green-500/50",
  },
  {
    title: "Loja de Cosméticos",
    description: "Use seus pontos para desbloquear bordas brilhantes, banners e títulos exclusivos.",
    icon: "💎",
    color: "from-purple-500/20 to-purple-500/5",
    border: "group-hover:border-purple-500/50",
  },
];

export default function Page() {
  return (
    // REMOVIDO: bg-background, min-h-screen e overflow-hidden. Agora é 100% transparente e fluido!
    <div className="flex flex-col items-center w-full selection:bg-primary/30 selection:text-white">

      {/* =========================================
          HERO SECTION
          ========================================= */}
      <section className="relative w-full flex flex-col items-center justify-center pt-24 pb-32 px-2 md:px-6 min-h-[85vh]">
        {/* Background Gradients de Impacto */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-40 pointer-events-none z-0">
          <Gradient className="-top-50 w-full h-200" conic />
        </div>
        
        {/* Glow Central Escondido */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-primary/10 blur-[150px] rounded-full pointer-events-none z-0"></div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-5xl space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">

          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-surface/30 backdrop-blur-md border border-white/5 text-gray-300 text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:border-primary/30 transition-colors cursor-default">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
            </span>
            A Nova Era das Conquistas
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-9xl font-black text-white tracking-tighter leading-[0.85] drop-shadow-2xl">
            Sua Jornada <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-primary to-purple-500 italic pr-2">
              Transformada.
            </span>
          </h1>

          <p className="text-gray-400 text-base md:text-2xl max-w-3xl font-medium leading-relaxed drop-shadow-md">
            O Nexus é a plataforma definitiva para caçadores de troféus. Sincronize seu progresso, 
            ganhe moedas por platinas e domine o ranking global em uma experiência premium.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-5 pt-8 w-full sm:w-auto">
            <Link
              href="/login"
              className="w-full sm:w-auto px-10 py-5 bg-linear-to-r from-primary to-blue-600 text-white font-black text-sm md:text-base uppercase tracking-widest rounded-2xl hover:scale-105 transition-all active:scale-95 shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:shadow-[0_0_60px_rgba(59,130,246,0.7)] flex items-center justify-center gap-3 group"
            >
              Começar a Caçada
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link
              href="/leaderboards"
              className="w-full sm:w-auto px-10 py-5 bg-surface/20 backdrop-blur-xl border border-white/5 text-white font-black text-sm md:text-base uppercase tracking-widest rounded-2xl hover:bg-surface/40 hover:border-white/10 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              🏆 Ver Ranking
            </Link>
          </div>
        </div>

        {/* Círculos Decorativos */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-250 min-h-250 opacity-10 pointer-events-none z-0 mix-blend-screen">
          <Image
            alt="Decoration"
            height={1000}
            src="circles.svg"
            width={1000}
            className="animate-[spin_90s_linear_infinite]"
          />
        </div>
      </section>

      {/* =========================================
          FEATURES SECTION
          ========================================= */}
      <section className="relative z-10 w-full max-w-7xl px-2 md:px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, index) => (
            <div
              key={index}
              className={`group bg-surface/20 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl ${feature.border} relative overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-linear-to-b ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-background/50 border border-white/5 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black text-white mb-4 transition-colors tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm font-medium leading-relaxed group-hover:text-gray-300 transition-colors">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          SHOWCASE / MOCKUP SECTION
          ========================================= */}
      <section className="relative w-full max-w-7xl px-2 md:px-6 pb-32 flex flex-col items-center">
        <div className="text-center mb-16 space-y-4 relative z-10">
          <h2 className="text-4xl md:text-6xl text-white font-black tracking-tighter italic">Estatísticas que <span className="text-primary">Inspiram.</span></h2>
          <p className="text-gray-400 font-medium max-w-xl mx-auto">Um ecossistema desenhado para recompensar o seu esforço e dedicação no mundo dos videojogos.</p>
        </div>

        <div className="w-full aspect-square md:aspect-video rounded-[3rem] bg-surface/10 backdrop-blur-3xl border border-white/5 shadow-2xl relative flex items-center justify-center group">
          
          <div className="absolute inset-0 bg-primary/5 opacity-50 group-hover:opacity-100 transition-opacity duration-1000 rounded-[3rem]"></div>

          <div className="relative z-10 w-full h-full flex items-center justify-center p-4 md:p-8">
            
            <div className="absolute top-10 md:top-20 left-2 md:left-20 bg-background/60 backdrop-blur-xl border border-white/5 p-4 md:p-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-[bounce_4s_infinite_ease-in-out] hover:scale-105 transition-transform cursor-default">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-[0_0_15px_rgba(59,130,246,0.3)]">🏆</div>
              <div>
                <p className="text-[9px] md:text-[10px] text-blue-400 font-black uppercase tracking-widest">Platina Desbloqueada</p>
                <p className="text-white font-black text-base md:text-lg">Elden Ring</p>
              </div>
            </div>

            <div className="absolute bottom-10 md:bottom-20 right-2 md:right-20 bg-background/60 backdrop-blur-xl border border-white/5 p-4 md:p-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-[bounce_5s_infinite_ease-in-out_reverse] hover:scale-105 transition-transform cursor-default">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-[0_0_15px_rgba(234,179,8,0.3)]">⭐</div>
              <div>
                <p className="text-[9px] md:text-[10px] text-yellow-500 font-black uppercase tracking-widest">Level Up</p>
                <p className="text-white font-black text-base md:text-lg">Mestre Caçador</p>
                <p className="text-gray-400 text-[10px] md:text-xs font-bold">+500 Nexus Coins</p>
              </div>
            </div>

            <div className="bg-surface/30 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl max-w-sm w-full text-center group-hover:border-primary/20 transition-colors duration-700">
               <div className="w-20 h-20 md:w-24 md:h-24 mx-auto bg-background/50 border-4 border-primary rounded-full mb-6 relative shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                 <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-xs font-black px-2 py-1 rounded-lg border-2 border-background">#1</div>
                 <span className="flex items-center justify-center w-full h-full text-3xl md:text-4xl">👑</span>
               </div>
               <h3 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter mb-2">Lenda Viva</h3>
               <div className="w-full bg-background/50 rounded-full h-2 md:h-3 mb-2 border border-white/5 overflow-hidden">
                 <div className="bg-linear-to-r from-primary to-purple-500 h-full w-[85%] rounded-full"></div>
               </div>
               <p className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest">Progresso Global</p>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================
          FOOTER DISCRETO
          ========================================= */}
      <footer className="w-full py-12 px-2 md:px-6 flex flex-col md:flex-row items-center justify-between max-w-7xl gap-8 relative z-10 border-t border-white/5 mt-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-linear-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg italic shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            N
          </div>
          <div>
            <span className="font-black text-white tracking-widest uppercase text-sm italic block">Nexus</span>
            <span className="text-xs text-primary font-bold tracking-widest uppercase">Achievements</span>
          </div>
        </div>

        <p className="text-gray-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-center">
          Desenvolvido para verdadeiros caçadores • 2026
        </p>

        <div className="flex gap-4">
          <a href="#" className="w-10 h-10 rounded-full bg-surface/30 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 hover:scale-110 transition-all">
            <span className="sr-only">Steam</span>
            <FaSteam className="text-lg" />
          </a>
          <a href="#" className="w-10 h-10 rounded-full bg-surface/30 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 hover:scale-110 transition-all">
            <span className="sr-only">Discord</span>
            <FaDiscord className="text-lg" />
          </a>
        </div>
      </footer>
    </div>
  );
}