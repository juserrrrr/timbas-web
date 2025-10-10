import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redireciona a rota principal do dashboard para a página de ranking por padrão.
  // Isso evita ter uma página "Início" vazia.
  redirect('/dashboard/ranking');

  return <div />;
}
