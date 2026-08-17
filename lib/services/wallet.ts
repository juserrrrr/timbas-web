import { post, request } from "./http"

export type WalletTxType =
  | "MATCH_WIN"
  | "MATCH_DRAW"
  | "MATCH_LOSS"
  | "TOURNAMENT_PRIZE"
  | "DRAFT_SALE"
  | "DRAFT_PURCHASE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADMIN_ADJUST"

export interface WalletTransaction {
  id: string
  amount: number
  balanceAfter: number
  type: WalletTxType
  description: string
  referenceType: string | null
  referenceId: string | null
  createdAt: string
}

export interface WalletBalance {
  balance: number
  totalEarned: number
  totalSpent: number
}

export interface WalletStatement extends WalletBalance {
  total: number
  items: WalletTransaction[]
}

export interface CoinRankingRow {
  position: number
  userId: number
  name: string
  avatar: string | null
  balance: number
  totalEarned: number
}

export const TX_LABELS: Record<WalletTxType, string> = {
  MATCH_WIN: "Vitória",
  MATCH_DRAW: "Empate",
  MATCH_LOSS: "Participação",
  TOURNAMENT_PRIZE: "Premiação",
  DRAFT_SALE: "Venda no mercado",
  DRAFT_PURCHASE: "Contratação",
  TRANSFER_IN: "Transferência recebida",
  TRANSFER_OUT: "Transferência enviada",
  ADMIN_ADJUST: "Ajuste da administração",
}

export function getBalance(): Promise<WalletBalance> {
  return request("/wallet")
}

export function getStatement(take = 25, skip = 0): Promise<WalletStatement> {
  return request(`/wallet/statement?take=${take}&skip=${skip}`)
}

export function getCoinRanking(take = 20): Promise<CoinRankingRow[]> {
  return request(`/wallet/ranking?take=${take}`)
}

export function adjustBalance(userId: number, amount: number, reason: string) {
  return post("/wallet/adjust", { userId, amount, reason })
}
