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
/// marca de beta em vez de bolinha de notificação. Fica colado no ícone, não no
/// canto do item: o canto é arredondado e cortava a bolinha.
export function BetaMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none inline-flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 text-[7px] font-black leading-none text-black ring-2 ring-[#07070c]",
        className,
      )}
    >
      B
    </span>
  )
}
