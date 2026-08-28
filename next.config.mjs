/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'dist',
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    localPatterns: [
      { pathname: '/images/awards/**' },
      { pathname: '/OIG.kjxVRTfiWRNi.jpg' },
      { pathname: '/timbasBot.png' },
    ],
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'ddragon.leagueoflegends.com' },
      { protocol: 'https', hostname: 'raw.communitydragon.org' },
    ],
  },
  reactCompiler: true,
  async rewrites() {
    return [
      { source: '/matches/:path*', destination: '/dashboard/active/:path*' },
      { source: '/match/:path*', destination: '/dashboard/match/:path*' },
      { source: '/history/:path*', destination: '/dashboard/history/:path*' },
      { source: '/stats/:path*', destination: '/dashboard/stats/:path*' },
      { source: '/teams/:path*', destination: '/dashboard/teams/:path*' },
      { source: '/versus/:path*', destination: '/dashboard/versus/:path*' },
      { source: '/ranking/:path*', destination: '/dashboard/ranking/:path*' },
      { source: '/tournaments/:path*', destination: '/dashboard/tournaments/:path*' },
      { source: '/draft/:path*', destination: '/dashboard/draft/:path*' },
      { source: '/ea-clubs/:path*', destination: '/dashboard/ea-clubs/:path*' },
      { source: '/clash/:path*', destination: '/dashboard/clash/:path*' },
      { source: '/verify/:path*', destination: '/dashboard/verify/:path*' },
      { source: '/lol-profile/:path*', destination: '/dashboard/lol-profile/:path*' },
      { source: '/streams/:path*', destination: '/dashboard/live/:path*' },
      { source: '/profile/:path*', destination: '/dashboard/profile/:path*' },
      { source: '/settings/:path*', destination: '/dashboard/settings/:path*' },
    ]
  },
}

export default nextConfig
