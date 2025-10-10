import type React from 'react';
import { Suspense } from 'react';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // O Suspense aqui é uma boa prática para lidar com o carregamento de dados nas páginas filhas
  return <Suspense>{children}</Suspense>;
}
