"use client"

import {
  createContext,
  useContext,
  useTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

type NavCtx = { navigate: (href: string) => void; setRouteLoading: (v: boolean) => void }

const NavigationContext = createContext<NavCtx>({ navigate: () => {}, setRouteLoading: () => {} })

// useLayoutEffect warns during SSR; loading.tsx renders on the server on hard loads
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [pending, startTransition] = useTransition()
  const [routeLoadingCount, setRouteLoadingCount] = useState(0)
  const router = useRouter()

  const setRouteLoading = useCallback((active: boolean) => {
    setRouteLoadingCount((count) => Math.max(0, count + (active ? 1 : -1)))
  }, [])

  const navigate = useCallback((href: string) => {
    startTransition(() => {
      router.push(href)
    })
  }, [router])

  const value = useMemo(() => ({ navigate, setRouteLoading }), [navigate, setRouteLoading])

  // pending: client transition via navigate(), routeLoading: route segment suspended (loading.tsx)
  const visible = pending || routeLoadingCount > 0

  return (
    <NavigationContext.Provider value={value}>
      {children}
      <div
        role="progressbar"
        aria-label="Carregando página"
        aria-hidden={!visible}
        className={`pointer-events-none fixed left-[65px] right-0 top-14 z-[70] h-0.5 overflow-hidden transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <span className="app-route-progress block h-full w-1/3 rounded-full bg-gradient-to-r from-blue-500 via-white to-red-500 shadow-lg shadow-blue-500/40" />
      </div>
    </NavigationContext.Provider>
  )
}

/**
 * Rendered by app/dashboard/loading.tsx while a route segment suspends.
 * Keeps the persistent shell visible while the new route content streams in.
 */
export function RouteLoadingSignal() {
  const { setRouteLoading } = useContext(NavigationContext)

  useIsomorphicLayoutEffect(() => {
    setRouteLoading(true)
    return () => setRouteLoading(false)
  }, [setRouteLoading])

  return (
    <div className="app-local-loading min-h-[280px] animate-pulse space-y-4 py-2" aria-label="Carregando conteúdo">
      <div className="h-24 rounded-[26px] border border-white/[0.08] bg-gradient-to-br from-white/[0.055] to-blue-500/[0.025]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent" />)}
      </div>
      <div className="h-40 rounded-[22px] border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-red-500/[0.015]" />
    </div>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
