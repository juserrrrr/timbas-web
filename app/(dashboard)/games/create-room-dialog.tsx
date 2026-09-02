"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (input: { name: string; password: string }) => void
}

export function CreateRoomDialog({ open, onOpenChange, onConfirm }: Props) {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")

  const confirm = () => {
    onConfirm({ name: name.trim() || "Sala do Timbas", password: password.trim() })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.08] bg-zinc-950 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase tracking-tight">Abrir uma sala</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Você entra como anfitrião e escolhe as regras antes de começar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
              Nome da sala
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 32))}
              placeholder="Expediente de sexta"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
              Senha (opcional)
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value.slice(0, 24))}
              placeholder="Deixe vazio para sala aberta"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={confirm}
          className="mt-2 w-full cursor-pointer rounded-xl bg-amber-400 px-4 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-300"
        >
          Abrir a sala
        </button>
      </DialogContent>
    </Dialog>
  )
}
