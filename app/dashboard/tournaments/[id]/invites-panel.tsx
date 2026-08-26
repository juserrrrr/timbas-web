"use client"

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { Ban, Check, Copy, Link2, Loader2, ShieldCheck, Sparkles, TicketCheck, TicketX, UserCheck } from "lucide-react"
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
  const [filter, setFilter] = useState<"all" | "available" | "used" | "revoked">("all")
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

  const filteredInvites = useMemo(() => invites.filter((invite) => {
    if (filter === "available") return !invite.usedAt && !invite.revokedAt
    if (filter === "used") return Boolean(invite.usedAt)
    if (filter === "revoked") return Boolean(invite.revokedAt)
    return true
  }), [filter, invites])

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
      {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-xs font-semibold text-emerald-200"><Check className="h-4 w-4 shrink-0" />{notice}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-xs font-semibold text-red-200">{error}</p>}

      <Card className="relative overflow-hidden border-white/[0.08] bg-[#08090d] shadow-2xl shadow-black/25">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_15%_0%,rgba(37,99,235,0.18),transparent_48%),radial-gradient(circle_at_90%_0%,rgba(220,38,38,0.12),transparent_42%)]" />

        <div className="relative flex flex-col gap-5 border-b border-white/[0.07] px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300 shadow-lg shadow-blue-950/30">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">Convites individuais</h3>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-gray-400">Uso único</span>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-400">Um link exclusivo para cada participante. Depois de aceito, ele é bloqueado automaticamente e continua registrado no histórico.</p>
            </div>
          </div>
          <Button onClick={() => void create()} disabled={!registrationOpen || busy === "create"} className="h-11 shrink-0 rounded-xl bg-blue-600 px-5 font-black text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500 disabled:opacity-40">
            {busy === "create" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Gerar novo convite
          </Button>
        </div>

        <div className="relative grid gap-3 border-b border-white/[0.07] p-4 sm:grid-cols-3 sm:p-6">
          <InviteCount active={filter === "available"} onClick={() => setFilter(filter === "available" ? "all" : "available")} label="Disponíveis" value={counts.available} detail="Prontos para enviar" tone="blue" icon={<Link2 className="h-4 w-4" />} />
          <InviteCount active={filter === "used"} onClick={() => setFilter(filter === "used" ? "all" : "used")} label="Utilizados" value={counts.used} detail="Entradas confirmadas" tone="green" icon={<TicketCheck className="h-4 w-4" />} />
          <InviteCount active={filter === "revoked"} onClick={() => setFilter(filter === "revoked" ? "all" : "revoked")} label="Cancelados" value={counts.revoked} detail="Links desativados" tone="red" icon={<TicketX className="h-4 w-4" />} />
        </div>

        <div className="relative p-4 sm:p-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-300">Histórico de convites</p>
              <p className="mt-1 text-[11px] text-gray-600">{filter === "all" ? `${invites.length} convites gerados` : `${filteredInvites.length} neste filtro`}</p>
            </div>
            {filter !== "all" && <button type="button" onClick={() => setFilter("all")} className="cursor-pointer text-[11px] font-bold text-blue-300 transition hover:text-blue-200">Limpar filtro</button>}
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.015]"><Loader2 className="h-5 w-5 animate-spin text-blue-400" /></div>
          ) : invites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-14 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300"><Link2 className="h-5 w-5" /></span><p className="mt-4 text-sm font-black text-gray-200">Nenhum convite gerado</p><p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500">Gere um link separado para cada participante. Assim você controla exatamente quem entrou.</p></div>
          ) : filteredInvites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-xs text-gray-500">Nenhum convite encontrado neste filtro.</div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {filteredInvites.map((invite) => {
                const used = Boolean(invite.usedAt)
                const revoked = Boolean(invite.revokedAt)
                const available = !used && !revoked
                const accent = available ? "border-blue-400/15 hover:border-blue-400/30" : used ? "border-emerald-400/15" : "border-red-400/15 opacity-75"
                return (
                  <article key={invite.id} className={`group relative overflow-hidden rounded-2xl border bg-white/[0.02] p-4 transition ${accent}`}>
                    <span className={`absolute inset-y-0 left-0 w-0.5 ${available ? "bg-blue-500" : used ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div className="flex items-start gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${available ? "border-blue-400/15 bg-blue-500/10 text-blue-300" : used ? "border-emerald-400/15 bg-emerald-500/10 text-emerald-300" : "border-red-400/15 bg-red-500/10 text-red-300"}`}>
                        {available ? <Link2 className="h-4 w-4" /> : used ? <TicketCheck className="h-4 w-4" /> : <TicketX className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-sm font-black tracking-wide text-gray-100">#{invite.code.slice(0, 8)}</span>
                          <InviteStatus available={available} used={used} />
                        </div>
                        <p className="mt-1 text-[10px] text-gray-600">Criado por <span className="font-semibold text-gray-500">{invite.createdBy?.name ?? "organização"}</span> · {formatDateTime(invite.createdAt)}</p>
                      </div>
                    </div>

                    <div className={`mt-3 rounded-xl border px-3 py-2.5 text-[11px] ${used ? "border-emerald-400/10 bg-emerald-400/[0.04] text-emerald-200/80" : revoked ? "border-red-400/10 bg-red-400/[0.04] text-red-200/70" : "border-white/[0.05] bg-black/20 text-gray-500"}`}>
                      {used ? <span className="flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" />Aceito por <b className="text-emerald-200">{invite.claimedBy?.name ?? "usuário"}</b> em {formatDateTime(invite.usedAt)}</span> : revoked ? `Cancelado em ${formatDateTime(invite.revokedAt)}` : "Aguardando alguém aceitar este link."}
                    </div>

                    {available && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => void copy(invite)} className="border-blue-400/15 bg-blue-400/[0.04] text-blue-100 hover:bg-blue-500/10"><Copy className="mr-1.5 h-3.5 w-3.5" />Copiar link</Button>
                        <Button variant="outline" size="sm" disabled={busy === invite.id} onClick={() => setRevokeTarget(invite)} className="border-red-400/15 bg-red-400/[0.03] text-red-300 hover:bg-red-500/10"><Ban className="mr-1.5 h-3.5 w-3.5" />Cancelar</Button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      <AlertDialog open={Boolean(revokeTarget)} onOpenChange={(open) => { if (!open) setRevokeTarget(null) }}>
        <AlertDialogContent className="border-white/10 bg-[#0b0b11] text-white">
          <AlertDialogHeader><AlertDialogTitle>Cancelar este convite?</AlertDialogTitle><AlertDialogDescription>O link deixar\u00e1 de funcionar imediatamente, mas continuar\u00e1 aparecendo no hist\u00f3rico.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => void revoke()} className="bg-red-600 text-white hover:bg-red-500">Cancelar convite</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InviteStatus({ available, used }: { available: boolean; used: boolean }) {
  return <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${available ? "border-blue-400/20 bg-blue-400/10 text-blue-300" : used ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-red-400/20 bg-red-400/10 text-red-300"}`}>{available ? "Disponível" : used ? "Utilizado" : "Cancelado"}</span>
}

function InviteCount({ label, value, detail, tone, icon, active, onClick }: { label: string; value: number; detail: string; tone: "blue" | "green" | "red"; icon: ReactNode; active: boolean; onClick: () => void }) {
  const colors = tone === "blue" ? "border-blue-400/20 bg-blue-500/[0.07] text-blue-300" : tone === "green" ? "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-300" : "border-red-400/20 bg-red-500/[0.06] text-red-300"
  return <button type="button" onClick={onClick} aria-pressed={active} className={`group flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.04] ${active ? colors : "border-white/[0.07] bg-white/[0.02] text-gray-400"}`}><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">{label}</span><span className="mt-0.5 block truncate text-[10px] text-gray-600">{detail}</span></span><strong className={`text-2xl font-black tabular-nums ${active ? "text-current" : tone === "blue" ? "text-blue-300" : tone === "green" ? "text-emerald-300" : "text-red-300"}`}>{value}</strong></button>
}
