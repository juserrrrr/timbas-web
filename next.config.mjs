/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'dist',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },
  reactCompiler: true,
}

export default nextConfig
