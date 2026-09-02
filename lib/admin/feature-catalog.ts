import {
  BarChart3,
  Boxes,
  Brain,
  ClipboardList,
  Crosshair,
  Gamepad2,
  History,
  Home,
  Joystick,
  LayoutDashboard,
  MonitorPlay,
  Radio,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Swords,
  Timer,
  Trophy,
  UserSearch,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react"
import type { AdminAccent } from "@/components/admin/shell"
import type { FeatureFlag } from "@/lib/services/feature-flags"

/// A API devolve as flags numa lista só, com a chave técnica e uma descrição
/// curta. Aqui elas ganham nome de gente, o lugar a que pertencem e um ícone,
/// para o painel poder abrir uma tela por assunto em vez de uma lista de vinte
/// interruptores.

export type FeatureCategory = {
  slug: string
  title: string
  menuLabel: string
  eyebrow: string
  description: string
  icon: LucideIcon
  accent: AdminAccent
  keys: string[]
}

export type FeatureMeta = {
  label: string
  hint: string
  icon: LucideIcon
}

export const FEATURE_META: Record<string, FeatureMeta> = {
  dashboard_home: {
    label: "Início do dashboard",
    hint: "A tela de resumo que abre quando alguém entra na plataforma.",
    icon: Home,
  },
  dashboard_settings: {
    label: "Configurações da conta",
    hint: "Preferências pessoais de cada jogador.",
    icon: Settings,
  },
  dashboard_matches_live: {
    label: "Partidas ao vivo",
    hint: "Criar partida customizada e acompanhar a que está rolando.",
    icon: Swords,
  },
  dashboard_matches_ranking: {
    label: "Ranking",
    hint: "Classificação geral por vitórias.",
    icon: Trophy,
  },
  dashboard_matches_history: {
    label: "Histórico",
    hint: "Lista de todas as partidas já disputadas.",
    icon: History,
  },
  dashboard_matches_teams: {
    label: "Duplas",
    hint: "Quem rende mais jogando junto.",
    icon: Users,
  },
  dashboard_matches_stats: {
    label: "Estatísticas",
    hint: "Desempenho detalhado partida a partida.",
    icon: BarChart3,
  },
  dashboard_matches_versus: {
    label: "Comparação",
    hint: "Confronto direto entre dois jogadores.",
    icon: Swords,
  },
  dashboard_tournaments: {
    label: "Campeonatos",
    hint: "Área de chaves, grupos e mata-mata no dashboard.",
    icon: Trophy,
  },
  dashboard_draft: {
    label: "Liga Draft",
    hint: "Sala de draft, elencos e rodadas da temporada.",
    icon: ClipboardList,
  },
  tournament_ea_results: {
    label: "Resultados pela API da EA",
    hint: "Fecha o placar do confronto com os dados que vêm da EA.",
    icon: Gamepad2,
  },
  tournament_ea_auto_sync: {
    label: "Busca automática na EA",
    hint: "O servidor procura sozinho a partida jogada, sem ninguém pedir.",
    icon: Timer,
  },
  tournament_ai_results: {
    label: "Prova de resultado por IA",
    hint: "Lê o print enviado e confere o placar antes da aprovação manual.",
    icon: Brain,
  },
  dashboard_ea_clubs: {
    label: "EA FC Clubs",
    hint: "Clubes sincronizados e estatísticas do EA FC no dashboard.",
    icon: Gamepad2,
  },
  dashboard_clash: {
    label: "Clash Scout",
    hint: "Scout do time adversário no Clash, com sugestão de banimento.",
    icon: Crosshair,
  },
  dashboard_lol_verify: {
    label: "Verificar conta da Riot",
    hint: "Vínculo entre a conta do Discord e a do League of Legends.",
    icon: ShieldCheck,
  },
  dashboard_lol_profile: {
    label: "Perfil LoL",
    hint: "Leitura do estilo de jogo a partir das partidas ranqueadas.",
    icon: UserSearch,
  },
  dashboard_games: {
    label: "Aba Jogos",
    hint: "A seção de jogos do Timbas no menu do dashboard.",
    icon: Joystick,
  },
  game_deducao: {
    label: "Timbas Detetive",
    hint: "Jogo 3D de dedução no escritório: tarefas, detetive e assassino.",
    icon: Search,
  },
  screen_share: {
    label: "Transmissão de tela",
    hint: "Deixa qualquer pessoa abrir uma live para a galera assistir.",
    icon: MonitorPlay,
  },
  live_sfu: {
    label: "Servidor de transmissão",
    hint: "Manda as lives pelo LiveKit em vez da conexão direta entre navegadores.",
    icon: Server,
  },
  live_limit_720p_30fps: {
    label: "Limite de 720p e 30 FPS",
    hint: "Segura a qualidade da live para gastar menos banda de quem assiste.",
    icon: Video,
  },
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    slug: "painel",
    title: "Painel do jogador",
    menuLabel: "Painel do jogador",
    eyebrow: "Recursos",
    description: "As áreas gerais que abrem quando alguém entra no Timbas.",
    icon: LayoutDashboard,
    accent: "sky",
    keys: ["dashboard_home", "dashboard_settings"],
  },
  {
    slug: "partidas",
    title: "Partidas e ranking",
    menuLabel: "Partidas",
    eyebrow: "Recursos",
    description: "Tudo que nasce da partida customizada: placar, ranking e as leituras em cima dele.",
    icon: Swords,
    accent: "emerald",
    keys: [
      "dashboard_matches_live",
      "dashboard_matches_ranking",
      "dashboard_matches_history",
      "dashboard_matches_teams",
      "dashboard_matches_stats",
      "dashboard_matches_versus",
    ],
  },
  {
    slug: "competicoes",
    title: "Competições",
    menuLabel: "Competições",
    eyebrow: "Recursos",
    description: "Campeonatos, Liga Draft e como o resultado de cada confronto chega até a chave.",
    icon: Trophy,
    accent: "amber",
    keys: [
      "dashboard_tournaments",
      "dashboard_draft",
      "tournament_ea_results",
      "tournament_ea_auto_sync",
      "tournament_ai_results",
    ],
  },
  {
    slug: "jogos",
    title: "Jogos conectados",
    menuLabel: "Jogos conectados",
    eyebrow: "Recursos",
    description: "O que a plataforma puxa da EA e da Riot para dentro do perfil de cada pessoa.",
    icon: Gamepad2,
    accent: "blue",
    keys: ["dashboard_ea_clubs", "dashboard_clash", "dashboard_lol_verify", "dashboard_lol_profile"],
  },
  {
    slug: "arcade",
    title: "Jogos do Timbas",
    menuLabel: "Jogos do Timbas",
    eyebrow: "Recursos",
    description: "A aba de jogos e cada título que roda dentro dela.",
    icon: Joystick,
    accent: "violet",
    keys: ["dashboard_games", "game_deducao"],
  },
  {
    slug: "transmissoes",
    title: "Transmissões",
    menuLabel: "Transmissões",
    eyebrow: "Recursos",
    description: "Quem pode transmitir, por onde o vídeo passa e com que qualidade ele sai.",
    icon: Radio,
    accent: "rose",
    keys: ["screen_share", "live_sfu", "live_limit_720p_30fps"],
  },
]

/// Flag nova na API cai aqui em vez de sumir da tela.
export const OTHER_FEATURES: FeatureCategory = {
  slug: "outros",
  title: "Outros recursos",
  menuLabel: "Outros",
  eyebrow: "Recursos",
  description: "Chaves que a API já conhece e o painel ainda não classificou.",
  icon: Boxes,
  accent: "slate",
  keys: [],
}

const CATEGORY_BY_KEY = new Map<string, FeatureCategory>(
  FEATURE_CATEGORIES.flatMap((category) => category.keys.map((key) => [key, category] as const)),
)

export function findFeatureCategory(slug: string): FeatureCategory | undefined {
  return slug === OTHER_FEATURES.slug ? OTHER_FEATURES : FEATURE_CATEGORIES.find((item) => item.slug === slug)
}

export function featureMeta(flag: FeatureFlag): FeatureMeta {
  return (
    FEATURE_META[flag.key] ?? {
      label: flag.description ?? flag.key,
      hint: "Recurso ainda sem descrição no painel.",
      icon: Boxes,
    }
  )
}

export type CategoryBucket = { category: FeatureCategory; flags: FeatureFlag[] }

/// Distribui a resposta da API pelas categorias, na ordem em que elas aparecem
/// no menu, e joga o resto em "Outros".
export function groupFeatureFlags(flags: FeatureFlag[]): CategoryBucket[] {
  const buckets = new Map<string, FeatureFlag[]>(FEATURE_CATEGORIES.map((category) => [category.slug, []]))
  const leftovers: FeatureFlag[] = []

  for (const flag of flags) {
    const category = CATEGORY_BY_KEY.get(flag.key)
    if (category) buckets.get(category.slug)!.push(flag)
    else leftovers.push(flag)
  }

  const ordered: CategoryBucket[] = FEATURE_CATEGORIES.map((category) => ({
    category,
    flags: category.keys
      .map((key) => buckets.get(category.slug)!.find((flag) => flag.key === key))
      .filter((flag): flag is FeatureFlag => Boolean(flag)),
  }))

  if (leftovers.length > 0) ordered.push({ category: OTHER_FEATURES, flags: leftovers })
  return ordered
}

export function flagsOfCategory(flags: FeatureFlag[], category: FeatureCategory): FeatureFlag[] {
  if (category.slug === OTHER_FEATURES.slug) {
    return flags.filter((flag) => !CATEGORY_BY_KEY.has(flag.key))
  }
  return category.keys
    .map((key) => flags.find((flag) => flag.key === key))
    .filter((flag): flag is FeatureFlag => Boolean(flag))
}
