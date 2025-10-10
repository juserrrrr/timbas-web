// Tipos da resposta da API
type ApiPlayer = {
  rank: number;
  name: string;
  discordId: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
};

// Tipo formatado para uso no componente
export type FormattedPlayer = {
  id: string;
  name: string;
  avatar: string;
  points: number;
  wins: number;
  losses: number;
  winRate: number;
  trend: 'up' | 'down' | 'stable';
};

export async function getLeaderboard(
  discordServerId: string
): Promise<FormattedPlayer[]> {
  // Usamos uma variável de ambiente do lado do servidor (sem NEXT_PUBLIC_)
  const apiToken = process.env.API_TOKEN;

  if (!apiToken) {
    console.error('API_TOKEN is not defined in environment variables.');
    throw new Error(
      'Erro de configuração do servidor. Contate o administrador.'
    );
  }

  const response = await fetch(
    `https://timbasapi.juserdev.com/leaderboard/${discordServerId}`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      // Cache e revalidação: busca novos dados a cada 60 segundos no máximo
      next: { revalidate: 60 },
    }
  );

  if (!response.ok) {
    // Em caso de erro, a mensagem será exibida na página do servidor
    throw new Error(
      'Falha ao buscar o ranking. O servidor da API pode estar indisponível.'
    );
  }

  const data: ApiPlayer[] = await response.json();

  return data.map((player) => ({
    id: player.discordId,
    name: player.name,
    avatar: '', // A API não fornece avatar, usaremos o fallback
    points: player.wins * 10 - player.losses * 5, // Cálculo de pontos como exemplo
    wins: player.wins,
    losses: player.losses,
    winRate: Math.round(player.winRate * 100),
    trend: 'stable', // Valor fixo como solicitado
  }));
}
