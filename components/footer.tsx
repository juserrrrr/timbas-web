import { Bot } from "lucide-react"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-black py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">TimbasBot</span>
            </div>
            <p className="max-w-md text-sm text-gray-400">
              O bot de Discord definitivo para organizar partidas competitivas 5v5 entre amigos. Sistema de ranking,
              estatísticas e muito mais.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/#features" className="hover:text-white">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#commands" className="hover:text-white">
                  Comandos
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Comunidade</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-white">
                  Discord
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2025 TimbasBot. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
