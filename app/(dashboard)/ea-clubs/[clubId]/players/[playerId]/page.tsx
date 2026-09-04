"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ClubPageHeader,
  ErrorState,
  formatDate,
  PageLoading,
} from "@/components/ea-clubs/shared";
import { Card } from "@/components/ui/card";
import { getEaClub, getEaClubPlayer } from "@/lib/services/ea-clubs";
import type {
  EaClub,
  EaClubPlayerProfile,
} from "@/lib/services/ea-clubs.types";

function display(value?: number | null, decimals = 0) {
  return value == null ? "-" : value.toFixed(decimals);
}

const positionNames: Record<string, string> = {
  goalkeeper: "Goleiro",
  defender: "Defensor",
  midfielder: "Meio-campista",
  forward: "Atacante",
};

function positionName(position?: string | null) {
  if (!position) return "-";
  return positionNames[position] ?? position.toUpperCase();
}

export default function EaClubPlayerPage() {
  const { clubId, playerId } = useParams<{
    clubId: string;
    playerId: string;
  }>();
  const [club, setClub] = useState<EaClub | null>(null);
  const [player, setPlayer] = useState<EaClubPlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clubData, playerData] = await Promise.all([
        getEaClub(clubId),
        getEaClubPlayer(clubId, playerId),
      ]);
      setClub(clubData);
      setPlayer(playerData);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }, [clubId, playerId]);

  useEffect(() => {
    void load();
  }, [load]);
  if (loading) return <PageLoading />;
  if (error || !player)
    return <ErrorState message={error} retry={() => void load()} />;

  const totals =
    player.eaClubGames == null
      ? []
      : [
          { label: "Partidas", value: player.eaClubGames },
          { label: "Gols", value: player.eaClubGoals },
          { label: "Assistências", value: player.eaClubAssists },
          { label: "MVPs", value: player.eaClubMvps },
          { label: "Média", value: display(player.eaClubRating, 1) },
          { label: "Passes certos", value: player.eaClubPassesMade },
          {
            label: "Precisão de passe",
            value:
              player.eaClubPassSuccessRate == null
                ? "-"
                : `${display(player.eaClubPassSuccessRate, 1)}%`,
          },
          { label: "Desarmes certos", value: player.eaClubTacklesMade },
          {
            label: "Precisão de desarme",
            value:
              player.eaClubTackleSuccessRate == null
                ? "-"
                : `${display(player.eaClubTackleSuccessRate, 1)}%`,
          },
          {
            label: "Aproveitamento de chute",
            value:
              player.eaClubShotSuccessRate == null
                ? "-"
                : `${display(player.eaClubShotSuccessRate, 1)}%`,
          },
          { label: "Clean sheets DEF", value: player.eaClubCleanSheetsDef },
          { label: "Clean sheets GK", value: player.eaClubCleanSheetsGk },
          { label: "Cartões vermelhos", value: player.eaClubRedCards },
        ];

  const recent = player.recentAnalysis;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ClubPageHeader
        name={player.playerName}
        subtitle={`Estatísticas no ${club?.nickname || club?.name || "clube"}`}
      />
      {totals.length > 0 ? (
        <section>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
                Total no clube
              </p>
              <h2 className="text-xl font-black text-white">
                Desempenho pelo clube
              </h2>
            </div>
            <p className="text-xs text-gray-500">
              Atualizado em {formatDate(player.eaClubStatsUpdatedAt, true)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
            {totals.map((item) => (
              <Card
                key={item.label}
                className="border-emerald-500/10 bg-emerald-500/[0.035] p-5 text-center"
              >
                <p className="text-2xl font-black text-white">
                  {item.value ?? "-"}
                </p>
                <p className="mt-1 text-xs text-gray-500">{item.label}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : (
        <Card className="border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="font-bold text-white">
            Estatísticas ainda indisponíveis
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Os totais deste jogador serão preenchidos na próxima sincronização
            com a EA.
          </p>
        </Card>
      )}

      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">
            Janela recente
          </p>
          <h2 className="text-xl font-black text-white">
            Análise das últimas {recent.windowSize} partidas
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {recent.matchesAvailable
              ? `${recent.matchesAvailable} partidas com dados detalhados. Chances criadas, toques e deslocamentos não são fornecidos pela EA.`
              : "Ainda não há partidas detalhadas para analisar."}
          </p>
        </div>
        {recent.matchesAvailable > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Nota média", display(recent.averageRating, 1)],
                ["Gols", recent.goals],
                ["Assistências", recent.assists],
                ["Chutes", recent.shots],
                [
                  "Conversão",
                  recent.shotConversion == null
                    ? "-"
                    : `${display(recent.shotConversion, 1)}%`,
                ],
                ["MVPs", recent.mvps],
              ].map(([label, value]) => (
                <Card
                  key={String(label)}
                  className="border-violet-500/10 bg-violet-500/[0.035] p-4 text-center"
                >
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-xs text-gray-500">{label}</p>
                </Card>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <Card className="border-white/[0.07] bg-white/[0.025] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-300">
                  Mapa de atuação por posição
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Distribuição das posições registradas, não é mapa de calor de
                  movimentação.
                </p>
                <div className="mt-4 space-y-3">
                  {recent.positionAnalysis.map((position) => (
                    <div key={position.position}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-bold text-white">
                          {positionName(position.position)}
                        </span>
                        <span className="text-gray-400">
                          {position.appearances} jogos, nota{" "}
                          {display(position.averageRating, 1)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-violet-400"
                          style={{
                            width: `${(position.appearances / recent.matchesAvailable) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="border-white/[0.07] bg-white/[0.025] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-300">
                  Precisão e impacto
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    ["Passes certos", recent.passesCompleted],
                    [
                      "Precisão de passe",
                      recent.passAccuracy == null
                        ? "-"
                        : `${display(recent.passAccuracy, 1)}%`,
                    ],
                    ["Desarmes certos", recent.tacklesCompleted],
                    [
                      "Precisão de desarme",
                      recent.tackleAccuracy == null
                        ? "-"
                        : `${display(recent.tackleAccuracy, 1)}%`,
                    ],
                    ["Defesas", recent.saves],
                    ["G+A", recent.goalContributions],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="rounded-lg bg-black/25 p-3 text-center"
                    >
                      <p className="font-bold text-white">{value}</p>
                      <p className="mt-0.5 text-[10px] uppercase text-gray-600">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            {(recent.strengths.length > 0 ||
              recent.improvements.length > 0) && (
              <div className="grid gap-3 lg:grid-cols-2">
                <Card className="border-emerald-500/15 bg-emerald-500/[0.04] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Pontos fortes
                  </p>
                  <div className="mt-3 space-y-3">
                    {recent.strengths.length ? (
                      recent.strengths.map((item) => (
                        <div key={item.metric}>
                          <p className="font-bold text-white">{item.metric}</p>
                          <p className="text-sm text-gray-400">
                            {item.message}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        Ainda não há base suficiente para destacar um ponto
                        forte.
                      </p>
                    )}
                  </div>
                </Card>
                <Card className="border-amber-500/15 bg-amber-500/[0.04] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Próximo foco
                  </p>
                  <div className="mt-3 space-y-3">
                    {recent.improvements.length ? (
                      recent.improvements.map((item) => (
                        <div key={item.metric}>
                          <p className="font-bold text-white">{item.metric}</p>
                          <p className="text-sm text-gray-400">
                            {item.message}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        Nenhum alerta claro com os dados disponíveis.
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-400">
            Análise por posição
          </p>
          <h2 className="text-xl font-black text-white">Onde rende melhor</h2>
          <p className="mt-1 text-sm text-gray-500">
            Análise agregada das atuações capturadas, sem exibir o histórico das
            partidas.
          </p>
        </div>
        {player.positionAnalysis.length > 0 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-blue-500/15 bg-blue-500/[0.05] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Posição mais jogada
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {positionName(player.mostPlayedPosition)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {player.positionAnalysis.find(
                    (item) => item.position === player.mostPlayedPosition,
                  )?.appearances ?? 0}{" "}
                  atuações registradas
                </p>
              </Card>
              <Card className="border-amber-500/15 bg-amber-500/[0.05] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Melhor desempenho
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {positionName(player.bestPosition)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Considera posições com pelo menos{" "}
                  {player.positionAnalysisMinimumAppearances} atuações
                </p>
              </Card>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {player.positionAnalysis.map((position) => (
                <Card
                  key={position.position}
                  className="border-white/[0.07] bg-white/[0.025] p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Posição
                      </p>
                      <h3 className="mt-1 text-xl font-black text-white">
                        {positionName(position.position)}
                      </h3>
                    </div>
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300">
                      {position.appearances} jogos
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {[
                      ["Nota", display(position.averageRating, 1)],
                      ["Gols", position.goals],
                      ["Assist.", position.assists],
                      ["G+A", position.goalContributions],
                      ["MVP", position.mvps],
                      ["Passes", position.passesCompleted],
                      [
                        "Prec. passe",
                        position.passAccuracy == null
                          ? "-"
                          : `${display(position.passAccuracy, 1)}%`,
                      ],
                      ["Desarmes", position.tacklesCompleted],
                      [
                        "Prec. desarme",
                        position.tackleAccuracy == null
                          ? "-"
                          : `${display(position.tackleAccuracy, 1)}%`,
                      ],
                      ["Defesas", position.saves],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg bg-black/25 p-2 text-center"
                      >
                        <p className="font-bold text-white">{value}</p>
                        <p className="mt-0.5 text-[10px] uppercase text-gray-600">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card className="border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="font-bold text-white">
              Análise por posição ainda indisponível
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Ela será formada conforme novas atuações forem capturadas.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}
