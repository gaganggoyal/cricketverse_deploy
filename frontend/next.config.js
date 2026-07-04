/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits .next/standalone (self-contained server.js) — the production
  // Dockerfile's runner stage copies exactly that.
  output: 'standalone',
  env: {
    NEXT_PUBLIC_SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SIM_URL:           process.env.NEXT_PUBLIC_SIM_URL || 'http://localhost:8000',
    NEXT_PUBLIC_MP_URL:            process.env.NEXT_PUBLIC_MP_URL  || 'ws://localhost:8001',
    NEXT_PUBLIC_APP_URL:           process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  experimental: { esmExternals: 'loose' },
  webpack(config) {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }]
    return config
  },
}
module.exports = nextConfig
