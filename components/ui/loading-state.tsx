"use client"

import { Swords } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  className?: string
  message?: string
}

export function LoadingState({ className, message }: LoadingStateProps) {
  return (
    <div className={cn("-mx-6 -my-8 flex min-h-[400px] flex-1 items-center justify-center", className)}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-20 w-20 items-center justify-center">
          {/* Camadas de brilho animadas */}
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20 duration-1000" />
          <div className="absolute inset-0 animate-pulse rounded-full bg-blue-500/10 ring-1 ring-blue-500/30" />
          
          {/* Container do ícone */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/5 shadow-2xl shadow-blue-500/20 ring-1 ring-blue-400/30">
            <Swords className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        {message && (
          <p className="animate-pulse text-sm font-medium text-blue-400/80 tracking-wide uppercase">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
