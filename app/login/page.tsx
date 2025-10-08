import { LoginForm } from "@/components/login-form"
import { Bot } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Background gradient effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 left-1/4 h-[800px] w-[800px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute -bottom-1/2 right-1/4 h-[800px] w-[800px] rounded-full bg-red-600/20 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">TimbasBot</span>
          </Link>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <LoginForm />
      </main>
    </div>
  )
}
