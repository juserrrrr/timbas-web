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
import { LoadingState } from "@/components/ui/loading-state"

type NavCtx = { navigate: (href: string) => void; setRouteLoading: (v: boolean) => void }

const NavigationContext = createContext<NavCtx>({ navigate: () => {}, setRouteLoading: () => {} })

// useLayoutEffect warns during SSR; loading.tsx renders on the server on hard loads
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [pending, startTransition] = useTransition()
  const [routeLoading, setRouteLoading] = useState(false)
  const router = useRouter()

  const navigate = useCallback((href: string) => {
    startTransition(() => {
      router.push(href)
    })
  }, [router])

  const value = useMemo(() => ({ navigate, setRouteLoading }), [navigate])

  // pending: client transition via navigate() — routeLoading: route segment suspended (loading.tsx)
  const visible = pending || routeLoading

  return (
    <NavigationContext.Provider value={value}>
      {children}
      {/* Background mounts/unmounts with visible — backdrop-blur only when visible */}
      {visible && <div className="fixed bottom-0 left-0 right-0 top-14 z-30 bg-[#050508]/80 backdrop-blur-sm md:left-[65px]" />}
      {/* LoadingState always in DOM — animate-ping never restarts */}
      <div
        style={{ pointerEvents: visible ? undefined : "none" }}
        className={`fixed bottom-0 left-0 right-0 top-14 z-30 flex items-center justify-center md:left-[65px] transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <LoadingState className="m-0 min-h-0" />
      </div>
    </NavigationContext.Provider>
  )
}

/**
 * Rendered by app/dashboard/loading.tsx while a route segment suspends.
 * Instead of mounting a second LoadingState (which restarts the animation),
 * it flips the shared overlay on — the same loader instance covers both
 * the navigation transition and the route suspense, with no visual reset.
 */
export function RouteLoadingSignal() {
  const { setRouteLoading } = useContext(NavigationContext)

  useIsomorphicLayoutEffect(() => {
    setRouteLoading(true)
    return () => setRouteLoading(false)
  }, [setRouteLoading])

  return null
}

export function useNavigation() {
  return useContext(NavigationContext)
}
