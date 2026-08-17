import { cn } from "@/lib/utils"

export function BetaBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-400",
        className,
      )}
    >
      Beta
    </span>
  )
}

/// Versão para o menu recolhido: um "b" dentro de um círculo, que se lê como
/// marca de beta em vez de bolinha de notificação.
export function BetaMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-[13px] w-[13px] items-center justify-center rounded-full border border-amber-500/50 bg-[#07070c] text-[8px] font-black leading-none text-amber-400",
        className,
      )}
    >
      B
    </span>
  )
}
