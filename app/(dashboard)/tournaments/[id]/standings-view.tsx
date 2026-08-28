"use client"

import { TeamCrest } from "@/components/competitions/shared"
import type { StandingRow, TournamentDetail } from "@/lib/services/tournaments.types"

function Table({ title, rows, cutLine }: { title: string; rows: StandingRow[]; cutLine?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <div className="border-b border-white/[0.06] px-4 py-2.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-wider text-gray-600">
              <th className="w-8 px-3 py-2 text-left font-bold">#</th>
              <th className="px-2 py-2 text-left font-bold">Time</th>
              <th className="w-10 px-1 py-2 text-center font-bold">J</th>
              <th className="w-10 px-1 py-2 text-center font-bold">V</th>
              <th className="w-10 px-1 py-2 text-center font-bold">E</th>
              <th className="w-10 px-1 py-2 text-center font-bold">D</th>
              <th className="w-14 px-1 py-2 text-center font-bold">Saldo</th>
              <th className="w-12 px-2 py-2 text-center font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const qualifies = cutLine !== undefined && row.position <= cutLine
              return (
                <tr
                  key={row.teamId}
                  className={`border-b border-white/[0.03] last:border-0 ${row.eliminated ? "opacity-40" : ""}`}
                >
                  <td className="px-3 py-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded text-[11px] font-black ${
                        qualifies ? "bg-emerald-500/15 text-emerald-400" : "text-gray-600"
                      }`}
                    >
                      {row.position}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <TeamCrest name={row.name} logoUrl={row.logoUrl} size={22} />
                      <span className="truncate font-semibold text-white">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-1 py-2 text-center tabular-nums text-gray-400">{row.played}</td>
                  <td className="px-1 py-2 text-center tabular-nums text-emerald-400">{row.wins}</td>
                  <td className="px-1 py-2 text-center tabular-nums text-gray-400">{row.draws}</td>
                  <td className="px-1 py-2 text-center tabular-nums text-red-400">{row.losses}</td>
                  <td className="px-1 py-2 text-center tabular-nums text-gray-400">
                    {row.scoreDiff > 0 ? `+${row.scoreDiff}` : row.scoreDiff}
                  </td>
                  <td className="px-2 py-2 text-center text-[15px] font-black tabular-nums text-white">{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function StandingsView({ tournament }: { tournament: TournamentDetail }) {
  const cutLine = tournament.format === "GROUPS_KNOCKOUT" ? tournament.advancePerGroup : undefined

  if (tournament.standings.every((group) => group.rows.length === 0)) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
        A tabela aparece assim que os times forem inscritos.
      </p>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {tournament.standings.map((group) => (
        <Table key={group.groupId ?? "geral"} title={group.groupName} rows={group.rows} cutLine={cutLine} />
      ))}
    </div>
  )
}
