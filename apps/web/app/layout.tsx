import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nexus Achievements",
  description: "O seu hub definitivo de conquistas gamer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased flex h-screen overflow-hidden bg-background text-foreground">
        
        {/* SIDEBAR */}
        <aside className="w-64 border-r border-border bg-surface hidden md:flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-border">
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-primary to-blue-500">
              NEXUS
            </h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link href="/dashboard" className="block px-4 py-2 rounded-md hover:bg-white/5 transition-colors">
              🏠 Início
            </Link>
            <Link href="/profile" className="block px-4 py-2 rounded-md hover:bg-white/5 transition-colors">
              🎮 Meu Perfil
            </Link>
            <Link href="/shop" className="block px-4 py-2 rounded-md hover:bg-white/5 transition-colors text-primary font-medium">
              🛒 Loja de Pontos
            </Link>
          </nav>
        </aside>

        {/* ÁREA PRINCIPAL */}
        <div className="flex-1 flex flex-col h-screen">
          
          {/* TOPBAR */}
          <header className="h-16 border-b border-border bg-surface/50 backdrop-blur flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-400">Hub Global</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-full border border-border">
                <span className="text-yellow-500 text-sm">🪙</span>
                <span className="text-sm font-bold">0</span>
              </div>
              {/* Placeholder do Avatar do Usuário */}
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-sm font-bold">
                U
              </div>
            </div>
          </header>

          {/* CONTEÚDO DA PÁGINA (CHILDREN) */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>

      </body>
    </html>
  );
}