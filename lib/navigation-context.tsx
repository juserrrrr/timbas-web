"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { LoadingState } from "@/components/ui/loading-state"

type NavCtx = { start: () => void; pending: boolean }

const NavigationContext = createContext<NavCtx>({ start: () => {} })

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const t = setTimeout(() => setPending(false), 200)
    return () => clearTimeout(t)
  }, [pathname])

  return (
    <NavigationContext.Provider value={{ start: () => setPending(true), pending }}>
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
