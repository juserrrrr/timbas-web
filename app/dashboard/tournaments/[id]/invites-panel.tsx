"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Ban, Check, Copy, Link2, Loader2, TicketCheck, TicketX, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { formatDateTime } from "@/components/competitions/shared"
import { createTournamentRegistrationInvite, listTournamentRegistrationInvites, revokeTournamentRegistrationInvite } from "@/lib/services/tournaments"
import type { TournamentRegistrationInvite } from "@/lib/services/tournaments.types"

export function InvitesPanel({ tournamentId, registrationOpen }: { tournamentId: string; registrationOpen: boolean }) {
  const [invites, setInvites] = useState<TournamentRegistrationInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [revokeTarget, setRevokeTarget] = useState<TournamentRegistrationInvite | null>(null)

  const load = useCallback(async () => {
    try {
      setInvites(await listTournamentRegistrationInvites(tournamentId))
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "N\u00e3o foi poss\u00edvel carregar os convites.")
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => { void load() }, [load])

  const counts = useMemo(() => ({
    available: invites.filter((invite) => !invite.usedAt && !invite.revokedAt).length,
    used: invites.filter((invite) => Boolean(invite.usedAt)).length,
    revoked: invites.filter((invite) => Boolean(invite.revokedAt)).length,
  }), [invites])

  const copy = async (invite: TournamentRegistrationInvite) => {
    const link = `${window.location.origin}/dashboard/tournaments?invite=${invite.code}`
    await navigator.clipboard.writeText(link)
    setNotice("Link copiado. Ele deixa de funcionar assim que uma conta aceitar o convite.")
  }

  const create = async () => {
    setBusy("create")
    setNotice("")
    try {
      const created = await createTournamentRegistrationInvite(tournamentId)
      await navigator.clipboard.writeText(`${window.location.origin}/dashboard/tournaments?invite=${created.code}`)
      await load()
      setNotice("Novo convite criado e copiado.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "N\u00e3o foi poss\u00edvel criar o convite.")
    } finally {
      setBusy("")
    }
  }

  const revoke = async () => {
    if (!revokeTarget) return
    setBusy(revokeTarget.id)
    try {
      await revokeTournamentRegistrationInvite(tournamentId, revokeTarget.id)
      setRevokeTarget(null)
      await load()
      setNotice("Convite cancelado. O link n\u00e3o pode mais ser utilizado.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "N\u00e3o foi poss\u00edvel cancelar o convite.")
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-white/[0.07] bg-white/[0.025]">
        <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] bg-gradient-to-r from-blue-500/[0.07] to-red-500/[0.04] p-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-blue-400" /><h3 className="text-sm font-black text-white">Convites individuais</h3></div>
            <p className="mt-1 text-xs text-gray-500">Cada link pode ser aceito por uma \u00fanica conta. O hist\u00f3rico permanece aqui.</p>
          </div>
          <Button onClick={() => void create()} disabled={!registrationOpen || busy === "create"} className="bg-blue-600 text-white hover:bg-blue-500">
            {busy === "create" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Link2 className="mr-1.5 h-4 w-4" />}
            Gerar e copiar convite
          </Button>
        </div>

        <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-b border-white/[0.06]">
          <InviteCount label="Dispon\u00edveis" value={counts.available} tone="text-blue-300" />
          <InviteCount label="Utilizados" value={counts.used} tone="text-emerald-300" />
          <InviteCount label="Cancelados" value={counts.revoked} tone="text-red-300" />
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-500" /></div>
        ) : invites.length === 0 ? (
          <div className="p-10 text-center"><Link2 className="mx-auto h-7 w-7 text-gray-700" /><p className="mt-2 text-sm font-bold text-gray-400">Nenhum convite gerado</p><p className="mt-1 text-xs text-gray-600">Crie um link separado para cada pessoa que voc\u00ea quiser convidar.</p></div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {invites.map((invite) => {
              const used = Boolean(invite.usedAt)
              const revoked = Boolean(invite.revokedAt)
              const available = !used && !revoked
              return (
                <div key={invite.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${available ? "bg-blue-500/10 text-blue-300" : used ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                    {available ? <Link2 className="h-4 w-4" /> : used ? <TicketCheck className="h-4 w-4" /> : <TicketX className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-300">#{invite.code.slice(0, 8)}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${available ? "border-blue-400/20 bg-blue-400/10 text-blue-300" : used ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-red-400/20 bg-red-400/10 text-red-300"}`}>{available ? "Dispon\u00edvel" : used ? "Utilizado" : "Cancelado"}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-600">Criado por {invite.createdBy?.name ?? "organiza\u00e7\u00e3o"} em {formatDateTime(invite.createdAt)}</p>
                    {used && <p className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-300/75"><UserCheck className="h-3 w-3" />Aceito por <b>{invite.claimedBy?.name ?? "usu\u00e1rio"}</b> em {formatDateTime(invite.usedAt)}</p>}
                    {revoked && <p className="mt-1 text-[11px] text-red-300/70">Cancelado em {formatDateTime(invite.revokedAt)}</p>}
                  </div>
                  {available && (
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" onClick={() => void copy(invite)}><Copy className="mr-1.5 h-3.5 w-3.5" />Copiar</Button>
                      <Button variant="outline" size="sm" disabled={busy === invite.id} onClick={() => setRevokeTarget(invite)} className="border-red-500/20 text-red-300 hover:bg-red-500/10"><Ban className="mr-1.5 h-3.5 w-3.5" />Cancelar</Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {notice && <p className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] px-4 py-3 text-xs text-emerald-200"><Check className="h-4 w-4" />{notice}</p>}
      {error && <p className="rounded-xl border border-red-500/15 bg-red-500/[0.05] px-4 py-3 text-xs text-red-300">{error}</p>}

      <AlertDialog open={Boolean(revokeTarget)} onOpenChange={(open) => { if (!open) setRevokeTarget(null) }}>
        <AlertDialogContent className="border-white/10 bg-[#0b0b11] text-white">
          <AlertDialogHeader><AlertDialogTitle>Cancelar este convite?</AlertDialogTitle><AlertDialogDescription>O link deixar\u00e1 de funcionar imediatamente, mas continuar\u00e1 aparecendo no hist\u00f3rico.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => void revoke()} className="bg-red-600 text-white hover:bg-red-500">Cancelar convite</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InviteCount({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="px-4 py-3 text-center"><p className={`text-xl font-black tabular-nums ${tone}`}>{value}</p><p className="text-[9px] font-bold uppercase tracking-wider text-gray-600">{label}</p></div>
}
