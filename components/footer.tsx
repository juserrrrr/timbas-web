import Image from "next/image"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#050508]">
      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl overflow-hidden ring-1 ring-white/10">
                <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="TimbasBot" width={36} height={36} className="object-cover" />
              </div>
              <span className="text-base font-black tracking-tight text-white">
                Timbas<span className="text-blue-400">Bot</span>
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-gray-600">
              O bot de Discord definitivo para organizar partidas 5v5 competitivas entre amigos.
              Ranking, estatísticas e histórico completo, tudo dentro do seu servidor.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-600">Navegação</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">Como Funciona</a></li>
              <li><a href="#commands" className="hover:text-white transition-colors">Comandos</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-600">Comunidade</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
              <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.05] pt-8 text-xs text-gray-700 sm:flex-row">
          <p>&copy; 2025 TimbasBot. Todos os direitos reservados.</p>
          <p>Feito com ♥ para a comunidade LoL</p>
        </div>
      </div>
    </footer>
  )
}
