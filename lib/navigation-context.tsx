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
      {pending && (
        <div className="fixed bottom-0 left-0 right-0 top-14 z-30 flex items-center justify-center bg-[#050508]/80 backdrop-blur-sm animate-in fade-in duration-150 md:left-[65px]">
          <LoadingState className="m-0 min-h-0" />
        </div>
      )}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
