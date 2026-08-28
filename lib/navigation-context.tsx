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
import { usePathname, useRouter } from "next/navigation"
import { useLinkStatus } from "next/link"
import { normalizeDashboardPathname } from "@/lib/navigation"

type NavCtx = { navigate: (href: string) => void; setRouteLoading: (v: boolean) => void }

const NavigationContext = createContext<NavCtx>({ navigate: () => {}, setRouteLoading: () => {} })

// useLayoutEffect warns during SSR; loading.tsx renders on the server on hard loads
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`app-skeleton-block rounded-2xl border border-white/[0.07] bg-white/[0.025] ${className}`} />
}

function DashboardSkeleton() {
  return <div className="space-y-4">
    <SkeletonBlock className="h-32 rounded-[28px]" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-24" />)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <SkeletonBlock className="h-56" />
      <SkeletonBlock className="h-56" />
    </div>
  </div>
}

function ProfileSkeleton() {
  return <div className="space-y-5">
    <div className="flex items-center gap-5 rounded-[28px] border border-white/[0.07] bg-white/[0.02] p-6">
      <SkeletonBlock className="h-24 w-24 shrink-0 rounded-full" />
      <div className="w-full space-y-3">
        <SkeletonBlock className="h-6 max-w-64" />
        <SkeletonBlock className="h-3 max-w-96" />
        <SkeletonBlock className="h-9 max-w-40 rounded-xl" />
      </div>
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <SkeletonBlock className="h-44 lg:col-span-2" />
      <SkeletonBlock className="h-44" />
    </div>
  </div>
}

function MatchSkeleton({ pathname }: { pathname: string }) {
  if (pathname === "/stats") return <div className="space-y-5">
    <SkeletonBlock className="h-11 w-full rounded-xl sm:w-[280px]" />
    <SkeletonBlock className="h-28 rounded-2xl border-dashed" />
  </div>

  if (pathname === "/teams") return <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((item) => <SkeletonBlock key={item} className="h-52" />)}</div>
    <SkeletonBlock className="h-56" />
  </div>

  if (pathname === "/versus") return <div className="space-y-4">
    <div className="grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5 sm:grid-cols-[1fr_auto_1fr]">
      <SkeletonBlock className="h-10" /><SkeletonBlock className="mx-auto h-10 w-10 rounded-full" /><SkeletonBlock className="h-10" />
    </div>
    <div className="grid gap-4 md:grid-cols-2"><SkeletonBlock className="h-48" /><SkeletonBlock className="h-48" /></div>
  </div>

  if (pathname === "/history") return <div className="space-y-3">
    {[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-20" />)}
  </div>

  if (pathname === "/matches") return <div className="grid gap-4 lg:grid-cols-2">
    {[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-36" />)}
  </div>

  return <div className="space-y-4">
    <SkeletonBlock className="mx-auto h-24 max-w-2xl rounded-[24px]" />
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1].map((team) => <div key={team} className="space-y-2 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4">
        <SkeletonBlock className="h-5 w-28" />
        {[0, 1, 2, 3].map((player) => <SkeletonBlock key={player} className="h-11" />)}
      </div>)}
    </div>
  </div>
}

function CardsSkeleton({ draft = false }: { draft?: boolean }) {
  return <div className="space-y-5">
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2"><SkeletonBlock className="h-7 w-52" /><SkeletonBlock className="h-3 w-72 max-w-full" /></div>
      <SkeletonBlock className="h-10 w-36 rounded-xl" />
    </div>
    <div className={`grid gap-4 ${draft ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
      {[0, 1, 2, 3, 4, 5].slice(0, draft ? 4 : 6).map((item) => <div key={item} className="space-y-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex items-center gap-3"><SkeletonBlock className="h-11 w-11 shrink-0 rounded-xl" /><div className="w-full space-y-2"><SkeletonBlock className="h-4 w-3/4" /><SkeletonBlock className="h-3 w-1/2" /></div></div>
        <SkeletonBlock className={draft ? "h-24" : "h-14"} />
      </div>)}
    </div>
  </div>
}

function TournamentDetailSkeleton() {
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-white/[0.07] bg-white/[0.02] p-5">
      <div className="flex items-center gap-4"><SkeletonBlock className="h-14 w-14 shrink-0 rounded-2xl" /><div className="space-y-2"><SkeletonBlock className="h-6 w-56" /><SkeletonBlock className="h-3 w-36" /></div></div>
      <SkeletonBlock className="h-10 w-32 rounded-xl" />
    </div>
    <div className="flex gap-2"><SkeletonBlock className="h-9 w-28 rounded-xl" /><SkeletonBlock className="h-9 w-28 rounded-xl" /><SkeletonBlock className="h-9 w-28 rounded-xl" /></div>
    <div className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]"><div className="grid grid-cols-2 gap-3"><SkeletonBlock className="h-24" /><SkeletonBlock className="h-24" /><SkeletonBlock className="h-24" /><SkeletonBlock className="h-24" /></div><SkeletonBlock className="h-56" /></div>
  </div>
}

function DraftDetailSkeleton() {
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div className="space-y-2"><SkeletonBlock className="h-7 w-64" /><SkeletonBlock className="h-3 w-80 max-w-full" /></div><SkeletonBlock className="h-10 w-32 rounded-xl" /></div>
    <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]"><div className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="flex items-center gap-3"><SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" /><SkeletonBlock className="h-10 flex-1" /></div>)}</div><div className="space-y-4"><SkeletonBlock className="h-32" /><SkeletonBlock className="h-40" /></div></div>
  </div>
}

function ClubDetailSkeleton() {
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-24" />)}</div>
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"><SkeletonBlock className="h-52" /><SkeletonBlock className="h-52" /></div>
  </div>
}

function TableSkeleton({ admin = false }: { admin?: boolean }) {
  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2"><SkeletonBlock className="h-7 w-56" /><SkeletonBlock className="h-3 w-80 max-w-full" /></div>
      <div className="flex gap-2"><SkeletonBlock className="h-10 w-28 rounded-xl" /><SkeletonBlock className={`h-10 rounded-xl ${admin ? "w-36" : "w-24"}`} /></div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015] p-3">
      <SkeletonBlock className="mb-3 h-11" />
      {[0, 1, 2, 3, 4, 5].map((row) => <div key={row} className="grid grid-cols-[1.4fr_0.8fr_0.6fr] gap-3 border-t border-white/[0.05] py-3"><SkeletonBlock className="h-4" /><SkeletonBlock className="h-4" /><SkeletonBlock className="h-4" /></div>)}
    </div>
  </div>
}

function AdminOverviewSkeleton() {
  return <div className="space-y-5">
    <div className="space-y-2"><SkeletonBlock className="h-8 w-64" /><SkeletonBlock className="h-3 w-96 max-w-full" /></div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-28" />)}</div>
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"><SkeletonBlock className="h-64" /><div className="grid gap-4"><SkeletonBlock className="h-[120px]" /><SkeletonBlock className="h-[120px]" /></div></div>
  </div>
}

function AdminFeaturesSkeleton() {
  return <div className="space-y-5">
    <div className="space-y-2"><SkeletonBlock className="h-8 w-72" /><SkeletonBlock className="h-3 w-96 max-w-full" /></div>
    <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="space-y-4 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5"><div className="flex justify-between"><SkeletonBlock className="h-5 w-40" /><SkeletonBlock className="h-6 w-11 rounded-full" /></div><SkeletonBlock className="h-3 w-4/5" /><SkeletonBlock className="h-10" /></div>)}</div>
  </div>
}

function WorkspaceSkeleton() {
  return <div className="space-y-4">
    <div className="space-y-2"><SkeletonBlock className="h-8 w-60" /><SkeletonBlock className="h-3 w-80 max-w-full" /></div>
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]"><div className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4"><SkeletonBlock className="h-10" /><SkeletonBlock className="h-10" /><SkeletonBlock className="h-32" /><SkeletonBlock className="h-10 w-36" /></div><SkeletonBlock className="h-[310px]" /></div>
  </div>
}

function PageSkeleton({ pathname }: { pathname: string }) {
  if (pathname === "/dashboard") return <DashboardSkeleton />
  if (pathname === "/profile" || pathname.startsWith("/settings")) return <ProfileSkeleton />
  if (["/matches", "/match", "/history", "/stats", "/teams", "/versus", "/ranking"].some((route) => pathname.startsWith(route))) return <MatchSkeleton pathname={pathname} />
  if (/^\/tournaments\/[^/]+/.test(pathname)) return <TournamentDetailSkeleton />
  if (pathname.startsWith("/tournaments")) return <CardsSkeleton />
  if (/^\/draft\/[^/]+/.test(pathname)) return <DraftDetailSkeleton />
  if (pathname.startsWith("/draft")) return <CardsSkeleton draft />
  if (/^\/ea-clubs\/[^/]+/.test(pathname)) return <ClubDetailSkeleton />
  if (pathname.startsWith("/streams") || pathname.startsWith("/ea-clubs")) return <CardsSkeleton />
  if (["/clash", "/verify", "/lol-profile"].some((route) => pathname.startsWith(route))) return <WorkspaceSkeleton />
  if (pathname === "/admin") return <AdminOverviewSkeleton />
  if (pathname.startsWith("/admin/features")) return <AdminFeaturesSkeleton />
  if (pathname.startsWith("/admin/lab") || pathname.startsWith("/admin/ai")) return <WorkspaceSkeleton />
  if (pathname.startsWith("/admin")) return <TableSkeleton admin />
  return <TableSkeleton />
}

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

  // pending: client transition, routeLoading: a content block is fetching remote data
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
 * Used inside the specific content block that is waiting for remote data.
 */
export function RouteLoadingSignal() {
  const { setRouteLoading } = useContext(NavigationContext)
  const pathname = normalizeDashboardPathname(usePathname())

  useIsomorphicLayoutEffect(() => {
    setRouteLoading(true)
    return () => setRouteLoading(false)
  }, [setRouteLoading])

  return (
    <div className="app-local-loading min-h-[280px] py-2" aria-label="Carregando conteúdo">
      <PageSkeleton pathname={pathname} />
    </div>
  )
}

export function NavigationLinkSignal() {
  const { pending } = useLinkStatus()
  const { setRouteLoading } = useContext(NavigationContext)

  useEffect(() => {
    if (!pending) return
    setRouteLoading(true)
    return () => setRouteLoading(false)
  }, [pending, setRouteLoading])

  return null
}

export function useNavigation() {
  return useContext(NavigationContext)
}
