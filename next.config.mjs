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
}

export default nextConfig
