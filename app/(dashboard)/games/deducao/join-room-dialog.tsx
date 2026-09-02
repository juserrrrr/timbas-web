"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { RoomSummary } from "@/lib/services/games"

interface Props {
  room: RoomSummary | null
  onOpenChange: (open: boolean) => void
  onConfirm: (room: RoomSummary, password: string) => void
}

export function JoinRoomDialog({ room, onOpenChange, onConfirm }: Props) {
  const [password, setPassword] = useState("")

  useEffect(() => setPassword(""), [room])

  return (
    <Dialog open={Boolean(room)} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.08] bg-zinc-950 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase tracking-tight">Sala com senha</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Digite a senha para entrar em {room?.name ?? "esta sala"}.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (room && password.trim()) onConfirm(room, password.trim())
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value.slice(0, 24))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={!password.trim()}
            className="w-full cursor-pointer rounded-xl bg-amber-400 px-4 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500"
          >
            Entrar
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
