import { RankingSection } from '@/components/ranking-section';
import { getLeaderboard } from '@/lib/api/leaderboard';
import { AlertTriangle } from 'lucide-react';

// Mock de servidores, idealmente isso também viria de uma API
const mockServers = [
  { id: '1', name: 'Galera do LoL', icon: '/server-1.jpg' },
  { id: '2', name: 'Pro Players BR', icon: '/server-2.jpg' },
  { id: '3', name: 'Amigos da Ranked', icon: '/server-3.jpg' },
  { id: '4', name: 'TimbasBot Official', icon: '/server-4.jpg' },
];

export default async function RankingPage({
  searchParams,
}: {
  searchParams?: { serverId?: string };
}) {
  const serverId = searchParams?.serverId || mockServers[0].id;
  let players = [];
  let error: string | null = null;

  try {
    // A chamada da API agora acontece no lado do servidor
    players = await getLeaderboard(serverId);
  } catch (err: any) {
    error = err.message || 'Ocorreu um erro desconhecido.';
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 rounded-lg border border-red-500/30 bg-red-500/10 p-8 text-white">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <h2 className="text-xl font-bold">
          Ocorreu um erro ao carregar o ranking
        </h2>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  // Passamos os dados pré-carregados para o componente de cliente
  return (
    <RankingSection
      players={players}
      servers={mockServers}
      initialServerId={serverId}
    />
  );
}
