import { LoginForm } from "@/components/login-form"
import { Header } from "@/components/header"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Background gradient effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 left-1/4 h-[800px] w-[800px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute -bottom-1/2 right-1/4 h-[800px] w-[800px] rounded-full bg-red-600/20 blur-[120px]" />
      </div>

      {/* Header */}
      <Header />

      {/* Login Form */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <LoginForm />
      </main>
    </div>
  )
}
