"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"

/// Um único listener de rolagem para a página inteira. Cada camada de parallax
/// e a barra de progresso do topo se inscrevem aqui, então a home tem um rAF só
/// em vez de um por elemento.
type ScrollListener = (scrollY: number, viewport: number) => void

const listeners = new Set<ScrollListener>()
let frame = 0

function emit() {
  frame = 0
  const scrollY = window.scrollY
  const viewport = window.innerHeight
  for (const listener of listeners) listener(scrollY, viewport)
}

function schedule() {
  if (frame) return
  frame = window.requestAnimationFrame(emit)
}

function subscribe(listener: ScrollListener) {
  if (listeners.size === 0) {
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule, { passive: true })
  }
  listeners.add(listener)
  schedule()

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      if (frame) window.cancelAnimationFrame(frame)
      frame = 0
    }
  }
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/// Aparece quando entra na tela e fica. Nada de sumir de novo na subida: a
/// pessoa já leu, reanimar só atrapalha.
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: "div" | "section" | "li" | "span" | "p"
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (prefersReducedMotion()) {
      node.classList.add("is-in")
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        node.classList.add("is-in")
        observer.disconnect()
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      className={`lp-reveal ${className}`}
      style={{ "--reveal-delay": `${delay}ms`, "--reveal-y": `${y}px` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}

/// Camada que anda mais devagar (ou mais rápido) que a rolagem. `speed` positivo
/// sobe, negativo desce, e o valor é a fração da distância percorrida.
export function Parallax({
  children,
  speed = 0.12,
  className = "",
}: {
  children: ReactNode
  speed?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || prefersReducedMotion()) return

    return subscribe((scrollY, viewport) => {
      const rect = node.getBoundingClientRect()
      // Centro do elemento contra o centro da tela: 0 quando alinhados.
      const distance = rect.top + rect.height / 2 - viewport / 2
      node.style.transform = `translate3d(0, ${(-distance * speed).toFixed(2)}px, 0)`
    })
  }, [speed])

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  )
}

/// Quanto da página já passou, de 0 a 1. Alimenta a barra fina do cabeçalho.
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    return subscribe((scrollY) => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      setProgress(total > 0 ? Math.min(1, Math.max(0, scrollY / total)) : 0)
    })
  }, [])

  return progress
}

/// Marca qual seção está sob o cabeçalho, para o menu acompanhar a rolagem.
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "")

  useEffect(() => {
    return subscribe(() => {
      let current = ids[0] ?? ""
      for (const id of ids) {
        const node = document.getElementById(id)
        if (node && node.getBoundingClientRect().top <= 140) current = id
      }
      setActive(current)
    })
  }, [ids])

  return active
}

/// Passo a passo das demonstrações. Só roda enquanto o bloco está na tela, para
/// não gastar bateria animando o que ninguém vê.
export function useSequence(length: number, intervalMs = 900) {
  const ref = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (prefersReducedMotion()) {
      setStep(length - 1)
      return
    }

    let timer = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!timer) timer = window.setInterval(() => setStep((value) => (value + 1) % length), intervalMs)
        } else if (timer) {
          window.clearInterval(timer)
          timer = 0
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(node)

    return () => {
      observer.disconnect()
      if (timer) window.clearInterval(timer)
    }
  }, [intervalMs, length])

  return { ref, step }
}

/// Número que sobe até o valor quando entra na tela.
export function Counter({ to, duration = 1400, className = "" }: { to: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node || to <= 0) return
    if (prefersReducedMotion()) {
      setValue(to)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        const started = performance.now()
        const tick = (now: number) => {
          const ratio = Math.min(1, (now - started) / duration)
          // Desacelera no fim, que é onde o número importa.
          setValue(Math.round(to * (1 - Math.pow(1 - ratio, 3))))
          if (ratio < 1) window.requestAnimationFrame(tick)
        }
        window.requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [duration, to])

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString("pt-BR")}
    </span>
  )
}
