import { LoadingState } from "@/components/ui/loading-state"

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#07070c]">
      <LoadingState message="Carregando" />
    </div>
  )
}
