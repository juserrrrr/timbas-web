"use client"

import { createContext, useContext, useTransition, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { LoadingState } from "@/components/ui/loading-state"

type NavCtx = { navigate: (href: string) => void }

const NavigationContext = createContext<NavCtx>({ navigate: () => {} })

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const navigate = useCallback((href: string) => {
    startTransition(() => {
      router.push(href)
    })
  }, [router])

  return (
    <NavigationContext.Provider value={{ navigate }}>
      {children}
      {/* Background mounts/unmounts with pending — backdrop-blur only when visible */}
      {pending && <div className="fixed bottom-0 left-0 right-0 top-14 z-30 bg-[#050508]/80 backdrop-blur-sm md:left-[65px]" />}
      {/* LoadingState always in DOM — animate-ping never restarts */}
      <div
        style={{ pointerEvents: pending ? undefined : "none" }}
        className={`fixed bottom-0 left-0 right-0 top-14 z-30 flex items-center justify-center md:left-[65px] transition-opacity duration-150 ${pending ? "opacity-100" : "opacity-0"}`}
      >
        <LoadingState className="m-0 min-h-0" />
      </div>
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
