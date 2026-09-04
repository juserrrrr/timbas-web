import {
  Brain,
  ClipboardList,
  FlaskConical,
  Gamepad2,
  LayoutDashboard,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
} from "lucide-react"
import { FEATURE_CATEGORIES } from "@/lib/admin/feature-catalog"
import type { NavGroup, NavItem } from "@/lib/navigation"

/// Navegação do painel. `permission` diz quem vê o item: sem permissão, o item
/// nem aparece, e a API recusa de qualquer jeito.
export type AdminNavItem = Omit<NavItem, "permission"> & { permission?: string | string[] }
export type AdminNavGroup = Omit<NavGroup, "items"> & { items: AdminNavItem[] }

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "painel",
    title: "Painel",
    items: [
      {
        icon: LayoutDashboard,
        label: "Visão geral",
        description: "Números da plataforma e atalhos",
        href: "/admin",
        exact: true,
        accent: "orange",
      },
      {
        icon: ShieldCheck,
        label: "Pessoas e acessos",
        description: "Contas, entrada, grupos e permissões",
        href: "/admin/access",
        accent: "violet",
        permission: ["users.approve", "users.manage", "groups.manage"],
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
    id: "integracoes",
    title: "Integrações",
    items: [
      {
        icon: Gamepad2,
        label: "EA FC Clubs",
        description: "Clubes sincronizados",
        href: "/admin/ea-clubs",
        accent: "blue",
      },
      {
        icon: Brain,
        label: "Inteligência artificial",
        description: "Provedor, modelo e recursos",
        href: "/admin/ai",
        accent: "violet",
        permission: "ai.manage",
      },
      {
        icon: Radio,
        label: "Transmissões",
        description: "Servidor, lives no ar e anúncio",
        href: "/admin/live",
        accent: "rose",
        permission: "stream.manage",
      },
    ],
  },
  {
    id: "recursos",
    title: "Recursos",
    items: [
      {
        icon: SlidersHorizontal,
        label: "Todos os recursos",
        description: "Panorama das funcionalidades ligadas",
        href: "/admin/features",
        exact: true,
        accent: "sky",
        permission: "features.manage",
      },
      /// Uma entrada por assunto: liga e desliga o que é de campeonato sem
      /// passar os olhos por vinte interruptores de outras áreas.
      ...FEATURE_CATEGORIES.map<AdminNavItem>((category) => ({
        icon: category.icon,
        label: category.menuLabel,
        description: category.description,
        href: `/admin/features/${category.slug}`,
        accent: category.accent === "fuchsia" || category.accent === "cyan" ? "violet" : category.accent,
        permission: "features.manage",
      })),
    ],
  },
  {
    id: "ferramentas",
    title: "Ferramentas",
    items: [
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
/// para quem já entrou no painel. A permissão sai do item no caminho: quem
/// desenha o menu já recebe só o que pode ser mostrado.
export function visibleAdminGroups(permissions: string[]): NavGroup[] {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => {
        if (!item.permission) return true
        return Array.isArray(item.permission)
          ? item.permission.some((permission) => permissions.includes(permission))
          : permissions.includes(item.permission)
      })
      .map(({ permission: _permission, ...item }) => item),
  })).filter((group) => group.items.length > 0)
}
