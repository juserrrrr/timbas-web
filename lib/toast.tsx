"use client"

import type { ReactNode } from "react"
import { toast as sonner } from "sonner"
import { ToastCard, type ToastTone } from "@/components/ui/toast-card"

export interface ToastOptions {
  description?: ReactNode
  /** Milissegundos. Infinity deixa o aviso aberto até alguém fechar. */
  duration?: number
  id?: string | number
}

/// Erro fica mais tempo na tela: quem errou precisa ler o motivo, quem acertou
/// só quer a confirmação.
const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 4_000,
  info: 4_500,
  warning: 5_500,
  error: 6_500,
  loading: Number.POSITIVE_INFINITY,
}

function show(tone: ToastTone, title: ReactNode, options: ToastOptions = {}) {
  const duration = options.duration ?? DEFAULT_DURATION[tone]

  return sonner.custom(
    (id) => (
      <ToastCard
        tone={tone}
        title={title}
        description={options.description}
        duration={duration}
        onDismiss={() => sonner.dismiss(id)}
      />
    ),
    { duration, id: options.id },
  )
}

/**
 * Avisos da plataforma.
 *
 * Passa por aqui em vez de chamar o sonner direto para que toda tela mostre o
 * mesmo card, com o mesmo trilho de tempo e a mesma hierarquia de texto. A
 * assinatura é a mesma de antes, então trocar o import basta.
 */
export const toast = Object.assign(
  (title: ReactNode, options?: ToastOptions) => show("info", title, options),
  {
    success: (title: ReactNode, options?: ToastOptions) => show("success", title, options),
    error: (title: ReactNode, options?: ToastOptions) => show("error", title, options),
    warning: (title: ReactNode, options?: ToastOptions) => show("warning", title, options),
    info: (title: ReactNode, options?: ToastOptions) => show("info", title, options),
    loading: (title: ReactNode, options?: ToastOptions) => show("loading", title, options),
    message: (title: ReactNode, options?: ToastOptions) => show("info", title, options),
    dismiss: (id?: string | number) => sonner.dismiss(id),
  },
)
