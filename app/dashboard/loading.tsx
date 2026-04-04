import { LoadingState } from "@/components/ui/loading-state"

export default function Loading() {
  return (
    <div className="fixed bottom-0 left-0 right-0 top-14 z-30 flex items-center justify-center bg-[#050508]/80 backdrop-blur-sm md:left-[65px]">
      <LoadingState className="m-0 min-h-0" />
    </div>
  )
}
