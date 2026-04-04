import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="-mx-6 -my-8 flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 ring-1 ring-blue-500/30">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
        <p className="text-sm font-medium text-gray-500 tracking-wide">Carregando...</p>
      </div>
    </div>
  )
}
