export const BRASILIA_TIME_ZONE = "America/Sao_Paulo"

/** Interpreta o valor sem fuso de datetime-local como horário de Brasília. */
export function brasiliaLocalToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Data e horário inválidos.")
  return new Date(`${value}:00-03:00`).toISOString()
}

/** Produz um valor datetime-local usando o relógio de Brasília, não o do navegador. */
export function brasiliaInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRASILIA_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`
}
