import {
  BarChart3,
  Gamepad2,
  History,
  Home,
  Radio,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Trophy,
  UserSearch,
  Users,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  icon: LucideIcon
  label: string
  description: string
  href: string
  accent: NavAccent
  beta?: boolean
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
      { icon: Home, label: "Início", description: "Resumo do servidor e atalhos rápidos", href: "/dashboard", accent: "blue" },
    ],
  },
  {
    id: "partida-customizada",
    title: "Partida Customizada",
    items: [
      { icon: Radio, label: "Ao Vivo", description: "Partidas acontecendo agora", href: "/dashboard/active", accent: "emerald" },
      { icon: Trophy, label: "Ranking", description: "Classificação geral de vitórias", href: "/dashboard/ranking", accent: "amber" },
      { icon: History, label: "Histórico", description: "Todas as partidas já disputadas", href: "/dashboard/history", accent: "violet" },
      { icon: Users, label: "Duplas", description: "Quem joga melhor junto", href: "/dashboard/teams", accent: "emerald" },
      { icon: BarChart3, label: "Estatísticas", description: "Números detalhados das partidas", href: "/dashboard/stats", accent: "rose" },
      { icon: Swords, label: "Comparação", description: "Confronto direto entre jogadores", href: "/dashboard/versus", accent: "orange" },
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
        href: "/dashboard/tournaments",
        accent: "amber",
        beta: true,
      },
      {
        icon: Users,
        label: "Liga Draft",
        description: "Monte seu elenco no draft e dispute as rodadas",
        href: "/dashboard/draft",
        accent: "emerald",
        beta: true,
      },
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
        href: "/dashboard/ea-clubs",
        accent: "blue",
      },
    ],
  },
  {
    id: "lol",
    title: "League of Legends",
    items: [
      { icon: ShieldAlert, label: "Clash Scout", description: "Análise do time adversário no Clash", href: "/dashboard/clash", accent: "amber", beta: true },
      { icon: ShieldCheck, label: "Verificar LoL", description: "Vincule sua conta da Riot", href: "/dashboard/verify", accent: "emerald", beta: true },
      { icon: UserSearch, label: "Perfil LoL", description: "Leitura do seu estilo de jogo", href: "/dashboard/lol-profile", accent: "sky", beta: true },
    ],
  },
]

export const FOOTER_ITEMS: NavItem[] = [
  { icon: Settings, label: "Configurações", description: "Preferências da sua conta", href: "/dashboard/settings", accent: "slate" },
]

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((group) => group.items), ...FOOTER_ITEMS]

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}
