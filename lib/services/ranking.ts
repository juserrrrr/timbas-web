// lib/services/ranking.ts

/**
 * Interface para o objeto de estatísticas do jogador retornado pela API.
 */
export interface PlayerStats {
  rank: number;
  userId: number;
  name: string;
  discordId: string;
  wins: number;
  losses: number;
  score: number;
  totalGames: number;
  winRate: number;
}

/**
 * Busca os dados do ranking da API para um servidor Discord específico.
 *
 * Esta é uma rota protegida e requer um token de autenticação JWT.
 *
 * @param token - O token JWT para autenticação.
 * @param discordServerId - O ID do servidor Discord para obter o ranking.
 * @returns Uma promessa que resolve para um array de objetos PlayerStats.
 */
export async function getRanking(token: string, discordServerId: string): Promise<PlayerStats[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined in environment variables.");
  }

  const response = await fetch(`${API_URL}/leaderboard/${discordServerId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar os dados do ranking. Status: ${response.status}`);
  }

  const data: PlayerStats[] = await response.json();


  return data;
}
