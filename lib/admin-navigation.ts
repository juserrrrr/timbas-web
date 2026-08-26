import {
  Brain,
  ClipboardList,
  FlaskConical,
  Gamepad2,
  LayoutDashboard,
  Radio,
  ShieldCheck,
  ToggleRight,
  Trophy,
} from "lucide-react"
import type { NavGroup, NavItem } from "@/lib/navigation"

/// Navegação do painel, nas mesmas categorias do dashboard. `permission` diz quem
/// vê o item: sem permissão, o item nem aparece, e a API recusa de qualquer jeito.
export type AdminNavItem = NavItem & { permission?: string | string[] }
export type AdminNavGroup = Omit<NavGroup, "items"> & { items: AdminNavItem[] }

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "geral",
    title: "Geral",
    items: [
      {
        icon: LayoutDashboard,
        label: "Visão geral",
        description: "Números da plataforma e atalhos",
        href: "/admin",
        accent: "orange",
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
        description: "Criar e acompanhar chaves",
        href: "/admin/competitions",
        accent: "amber",
        permission: "tournament.create",
      },
      {
        icon: ClipboardList,
        label: "Liga Draft",
        description: "Ligas, pool e base de jogadores",
        href: "/admin/draft",
        accent: "emerald",
        permission: "draft.create",
      },
    ],
  },
  {
    id: "ea-fc",
    title: "EA FC",
    items: [
      { icon: Gamepad2, label: "EA FC Clubs", description: "Clubes sincronizados", href: "/admin/ea-clubs", accent: "blue" },
    ],
  },
  {
    id: "plataforma",
    title: "Plataforma",
    items: [
      {
        icon: ShieldCheck,
        label: "Pessoas e acessos",
        description: "Contas, entrada, grupos e permissões",
        href: "/admin/access",
        accent: "violet",
        permission: ["users.approve", "users.manage", "groups.manage"],
      },
      { icon: Brain, label: "IA", description: "Provedor, modelo e recursos", href: "/admin/ai", accent: "violet", permission: "ai.manage" },
      {
        icon: ToggleRight,
        label: "Recursos",
        description: "Liga e desliga funcionalidades",
        href: "/admin/features",
        accent: "orange",
        permission: "features.manage",
      },
      {
        icon: Radio,
        label: "Transmissões",
        description: "Canal usado para anunciar lives",
        href: "/admin/live",
        accent: "rose",
        permission: "stream.manage",
      },
      {
        icon: FlaskConical,
        label: "Laboratório",
        description: "Dados de teste com debug na tela",
        href: "/admin/lab",
        accent: "orange",
        permission: "demo.manage",
      },
    ],
  },
]

export const ADMIN_FOOTER_ITEMS: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: "Voltar ao Timbas",
    description: "Sai do painel e volta a jogar",
    href: "/dashboard",
    accent: "slate",
  },
]

/// Esconde o que a pessoa não pode usar. Item sem permissão declarada aparece
/// para quem já entrou no painel.
export function visibleAdminGroups(permissions: string[]): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!item.permission) return true
      return Array.isArray(item.permission)
        ? item.permission.some((permission) => permissions.includes(permission))
        : permissions.includes(item.permission)
    }),
  })).filter((group) => group.items.length > 0)
}
