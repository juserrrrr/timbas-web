import {
  BarChart3,
  ClipboardList,
  Gamepad2,
  History,
  Home,
  Joystick,
  MonitorPlay,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Trophy,
  UserSearch,
  Users,
  type LucideIcon,
} from "lucide-react"
import {
  FEATURE_DASHBOARD_CLASH,
  FEATURE_DASHBOARD_DRAFT,
  FEATURE_DASHBOARD_EA,
  FEATURE_DASHBOARD_GAMES,
  FEATURE_DASHBOARD_HOME,
  FEATURE_DASHBOARD_LOL_PROFILE,
  FEATURE_DASHBOARD_LOL_VERIFY,
  FEATURE_DASHBOARD_MATCHES_HISTORY,
  FEATURE_DASHBOARD_MATCHES_LIVE,
  FEATURE_DASHBOARD_MATCHES_RANKING,
  FEATURE_DASHBOARD_MATCHES_STATS,
  FEATURE_DASHBOARD_MATCHES_TEAMS,
  FEATURE_DASHBOARD_MATCHES_VERSUS,
  FEATURE_DASHBOARD_SETTINGS,
  FEATURE_DASHBOARD_TOURNAMENTS,
  FEATURE_SCREEN_SHARE,
} from "@/lib/services/feature-flags"

export type NavItem = {
  icon: LucideIcon
  label: string
  description: string
  href: string
  activeHrefs?: string[]
  /// Só fica ativo na própria rota. Serve para item que é raiz de outros, como
  /// a visão geral do painel e a lista de recursos, que senão ficaria aceso o
  /// tempo todo.
  exact?: boolean
  accent: NavAccent
  beta?: boolean
  /// Recurso controlado por feature flag. Com a flag desligada o item continua
  /// na lista, marcado como bloqueado, em vez de sumir do menu.
  flag?: string
  permission?: string
  /// Recurso que o admin abre mesmo com a flag desligada, para conferir antes
  /// de liberar para todo mundo. Só vale para a flag: permissão continua
  /// valendo, e o admin já tem todas.
  adminBypass?: boolean
  /// Preenchido em runtime por navGroupsFor: a flag do item está desligada.
  locked?: boolean
  lockedReason?: "feature" | "permission"
}

export type NavGroup = {
  id: string
  title: string
  items: NavItem[]
}

export type NavAccent = keyof typeof ACCENTS

export const ACCENTS = {
  blue: { text: "text-blue-400", bg: "bg-blue-500/10", ring: "ring-blue-500/25", bar: "bg-blue-400", glow: "shadow-blue-500/20" },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/25", bar: "bg-emerald-400", glow: "shadow-emerald-500/20" },
  amber: { text: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/25", bar: "bg-amber-400", glow: "shadow-amber-500/20" },
  violet: { text: "text-violet-400", bg: "bg-violet-500/10", ring: "ring-violet-500/25", bar: "bg-violet-400", glow: "shadow-violet-500/20" },
  rose: { text: "text-rose-400", bg: "bg-rose-500/10", ring: "ring-rose-500/25", bar: "bg-rose-400", glow: "shadow-rose-500/20" },
  sky: { text: "text-sky-400", bg: "bg-sky-500/10", ring: "ring-sky-500/25", bar: "bg-sky-400", glow: "shadow-sky-500/20" },
  orange: { text: "text-orange-400", bg: "bg-orange-500/10", ring: "ring-orange-500/25", bar: "bg-orange-400", glow: "shadow-orange-500/20" },
  slate: { text: "text-slate-300", bg: "bg-white/[0.06]", ring: "ring-white/15", bar: "bg-slate-300", glow: "shadow-white/10" },
} as const

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "geral",
    title: "Geral",
    items: [
      { icon: Home, label: "Início", description: "Resumo do Timbas e atalhos rápidos", href: "/dashboard", accent: "blue", flag: FEATURE_DASHBOARD_HOME, permission: "dashboard.home" },
      {
        icon: MonitorPlay,
        label: "Transmissões",
        description: "Compartilhe sua tela ao vivo com a galera",
        href: "/streams",
        accent: "rose",
        beta: true,
        flag: FEATURE_SCREEN_SHARE,
        permission: "dashboard.live",
      },
    ],
  },
  {
    id: "competicoes",
    title: "Competições",
    items: [
      {
        icon: Trophy,
        label: "Campeonatos",
        description: "Chaves, grupos e mata-mata de qualquer jogo",
        href: "/tournaments",
        accent: "amber",
        beta: true,
        flag: FEATURE_DASHBOARD_TOURNAMENTS,
        permission: "dashboard.tournaments",
      },
      {
        icon: ClipboardList,
        label: "Liga Draft",
        description: "Monte seu elenco no draft e dispute as rodadas",
        href: "/draft",
        accent: "emerald",
        beta: true,
        flag: FEATURE_DASHBOARD_DRAFT,
        permission: "dashboard.draft",
      },
    ],
  },
  {
    id: "partida-customizada",
    title: "Partida Customizada",
    items: [
      { icon: Swords, label: "Partidas", description: "Crie, consulte o histórico e veja seu desempenho", href: "/matches", activeHrefs: ["/history", "/stats", "/teams", "/versus", "/match"], accent: "emerald", flag: FEATURE_DASHBOARD_MATCHES_LIVE, permission: "dashboard.matches.live" },
      { icon: Trophy, label: "Ranking", description: "Classificação geral de vitórias", href: "/ranking", accent: "amber", flag: FEATURE_DASHBOARD_MATCHES_RANKING, permission: "dashboard.matches.ranking" },
    ],
  },
  {
    id: "ea-fc",
    title: "EA FC",
    items: [
      {
        icon: Gamepad2,
        label: "EA FC Clubs",
        description: "Estatísticas sincronizadas dos seus clubes",
        href: "/ea-clubs",
        accent: "blue",
        flag: FEATURE_DASHBOARD_EA,
        permission: "dashboard.ea",
      },
    ],
  },
  {
    id: "jogos",
    title: "Jogos",
    items: [
      {
        icon: Joystick,
        label: "Jogos",
        description: "Salas de jogos para jogar com a galera aqui mesmo",
        href: "/games",
        accent: "violet",
        beta: true,
        flag: FEATURE_DASHBOARD_GAMES,
        permission: "dashboard.games",
        adminBypass: true,
      },
    ],
  },
  {
    id: "lol",
    title: "League of Legends",
    items: [
      { icon: ShieldAlert, label: "Rift Tools", description: "Scout, conta Riot e análise de perfil", href: "/clash", activeHrefs: ["/verify", "/lol-profile"], accent: "amber", beta: true, flag: FEATURE_DASHBOARD_CLASH, permission: "dashboard.clash" },
    ],
  },
]

export const FOOTER_ITEMS: NavItem[] = [
  { icon: Settings, label: "Configurações", description: "Preferências da sua conta", href: "/settings", accent: "slate", flag: FEATURE_DASHBOARD_SETTINGS, permission: "dashboard.settings" },
]

const GROUPED_ROUTE_ACCESS: NavItem[] = [
  { icon: History, label: "Histórico", description: "Todas as partidas já disputadas", href: "/history", accent: "violet", flag: FEATURE_DASHBOARD_MATCHES_HISTORY, permission: "dashboard.matches.history" },
  { icon: BarChart3, label: "Estatísticas", description: "Desempenho detalhado das partidas", href: "/stats", accent: "rose", flag: FEATURE_DASHBOARD_MATCHES_STATS, permission: "dashboard.matches.stats" },
  { icon: Users, label: "Duplas", description: "Quem joga melhor junto", href: "/teams", accent: "emerald", flag: FEATURE_DASHBOARD_MATCHES_TEAMS, permission: "dashboard.matches.teams" },
  { icon: Swords, label: "Comparação", description: "Confronto direto entre jogadores", href: "/versus", accent: "orange", flag: FEATURE_DASHBOARD_MATCHES_VERSUS, permission: "dashboard.matches.versus" },
  { icon: ShieldCheck, label: "Verificar LoL", description: "Vincule sua conta da Riot", href: "/verify", accent: "emerald", beta: true, flag: FEATURE_DASHBOARD_LOL_VERIFY, permission: "dashboard.lol.verify" },
  { icon: UserSearch, label: "Perfil LoL", description: "Leitura do seu estilo de jogo", href: "/lol-profile", accent: "sky", beta: true, flag: FEATURE_DASHBOARD_LOL_PROFILE, permission: "dashboard.lol.profile" },
]

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((group) => group.items), ...GROUPED_ROUTE_ACCESS, ...FOOTER_ITEMS]

const DASHBOARD_ROUTE_ALIASES: Record<string, string> = {
  active: "matches",
  live: "streams",
}

export function normalizeDashboardPathname(pathname: string): string {
  if (!pathname.startsWith("/dashboard/")) return pathname
  const segments = pathname.slice("/dashboard/".length).split("/")
  segments[0] = DASHBOARD_ROUTE_ALIASES[segments[0]] ?? segments[0]
  return `/${segments.join("/")}`
}

/// Rotas que dividem a mesma casca: cabeçalho e abas desenhados por um
/// layout comum. Dentro do grupo a chave do conteúdo não muda, então trocar de
/// aba troca só o miolo em vez de remontar a tela inteira e piscar tudo junto.
const SHELL_GROUPS: Record<string, string[]> = {
  rift: ["/clash", "/verify", "/lol-profile"],
}

export function dashboardShellKey(pathname: string): string {
  const normalized = normalizeDashboardPathname(pathname)
  const group = Object.entries(SHELL_GROUPS).find(([, routes]) =>
    routes.some((route) => normalized === route || normalized.startsWith(`${route}/`)),
  )
  return group ? group[0] : normalized
}

/// Marca o que está atrás de feature flag desligada em vez de esconder. Item
/// que aparece e some conforme o admin mexe nas flags confunde mais do que
/// ajuda: a pessoa não sabe se o recurso existe, se sumiu ou se quebrou. Assim
/// ele fica sempre visível, com cadeado, e a própria página explica o motivo.
/// `flags` em null significa que a resposta da API ainda não chegou, e nesse
/// caso nada é marcado: um cadeado que aparece e some é pior do que esperar.
function navItemForAccess(
  item: NavItem,
  flags: string[] | null,
  permissions: string[] | null,
  role: string | null = null,
): NavItem {
  const bypass = Boolean(item.adminBypass) && role === "ADMIN"
  const featureLocked = !bypass && Boolean(flags) && Boolean(item.flag) && !flags!.includes(item.flag!)
  const permissionLocked = Boolean(permissions) && Boolean(item.permission) && !permissions!.includes(item.permission!)
  return {
    ...item,
    locked: featureLocked || permissionLocked,
    lockedReason: featureLocked ? "feature" : permissionLocked ? "permission" : undefined,
  }
}

export function navGroupsFor(
  flags: string[] | null,
  permissions: string[] | null = null,
  role: string | null = null,
): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) => navItemForAccess(item, flags, permissions, role)),
  }))
}

export function footerItemsFor(
  flags: string[] | null,
  permissions: string[] | null,
  role: string | null = null,
): NavItem[] {
  return FOOTER_ITEMS.map((item) => navItemForAccess(item, flags, permissions, role))
}

export function isNavItemActive(
  pathname: string,
  href: string,
  activeHrefs: string[] = [],
  exact = false,
): boolean {
  const normalizedPathname = normalizeDashboardPathname(pathname)
  if (exact || href === "/dashboard") return [href, ...activeHrefs].includes(normalizedPathname)
  return [href, ...activeHrefs].some((candidate) => normalizedPathname === candidate || normalizedPathname.startsWith(`${candidate}/`))
}
