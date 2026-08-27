import Image from "next/image"
import Link from "next/link"

const COLUMNS = [
  {
    title: "Na plataforma",
    links: [
      { label: "Partida personalizada", href: "#partidas" },
      { label: "Campeonatos", href: "#campeonatos" },
      { label: "EA FC automático", href: "#ea" },
      { label: "Liga Draft", href: "#draft" },
    ],
  },
  {
    title: "Também tem",
    links: [
      { label: "Transmissões", href: "#transmissoes" },
      { label: "Rift Tools", href: "#rift" },
      { label: "Bot no Discord", href: "#bot" },
      { label: "Premiação", href: "#premiacao" },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#050508]">
      <div className="container mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-9 overflow-hidden rounded-xl ring-1 ring-white/10">
                <Image src="/OIG.kjxVRTfiWRNi.jpg" alt="Timbas" width={36} height={36} className="object-cover" />
              </span>
              <span className="text-[15px] font-black tracking-tight text-white">Timbas</span>
            </div>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-gray-600">
              A casa da comunidade: partida personalizada, campeonato de qualquer jogo, liga draft de EA FC,
              transmissão ao vivo e um bot no Discord que segura a ponta do dia a dia.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-600">{column.title}</h3>
              <ul className="mt-4 space-y-2.5 text-[13px] text-gray-500">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="transition-colors hover:text-white">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.05] pt-8 text-[12px] text-gray-700 sm:flex-row">
          <p>Timbas, feito para a galera do servidor.</p>
          <Link href="/dashboard" className="transition-colors hover:text-gray-300">
            Entrar no painel
          </Link>
        </div>
      </div>
    </footer>
  )
}
