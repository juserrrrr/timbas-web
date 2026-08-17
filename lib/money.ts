/// Dinheiro da liga de draft em reais, na escala do futebol: acima de um milhão
/// ninguém lê o número inteiro, então ele vira "R$ 12,5 mi".
export function formatMoney(value: number): string {
  const negative = value < 0
  const amount = Math.abs(value)
  const body =
    amount >= 1_000_000_000
      ? `${trim(amount / 1_000_000_000)} bi`
      : amount >= 1_000_000
        ? `${trim(amount / 1_000_000)} mi`
        : amount >= 100_000
          ? `${trim(amount / 1_000)} mil`
          : amount.toLocaleString("pt-BR")

  return `${negative ? "-" : ""}R$ ${body}`
}

/// Valor cheio, para quando o número exato importa (extrato, lance).
export function formatMoneyFull(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR")}`
}

function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return rounded.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
}
