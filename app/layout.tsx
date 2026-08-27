import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

import { ThemeProvider } from "@/components/theme-provider"
import { AnnouncementModal } from "@/components/announcement-modal"
import { Toaster } from "@/components/ui/sonner"
import { PUBLIC_API_URL } from "@/lib/api-base"

export const metadata: Metadata = {
  title: "Timbas",
  description: "Organize partidas competitivas entre amigos, com ranking, estatísticas e o nosso bot no Discord",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // A API mora em outro domínio, então a primeira chamada do app pagava DNS,
  // TCP e TLS antes de sair do lugar. Abrindo a conexão junto com o HTML esse
  // custo acontece em paralelo e não no meio do caminho.
  const apiOrigin = (() => {
    try {
      return PUBLIC_API_URL ? new URL(PUBLIC_API_URL).origin : null
    } catch {
      return null
    }
  })()

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {apiOrigin && (
          <>
            <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={apiOrigin} />
          </>
        )}
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased [scrollbar-gutter:stable]`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>{children}</Suspense>
          <AnnouncementModal />
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}

