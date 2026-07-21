/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits .next/standalone (self-contained server.js) — the production
  // Dockerfile's runner stage copies exactly that.
  output: 'standalone',
  // Only genuinely public values belong here — anything listed is inlined
  // into the browser bundle. DB_* credentials are read at runtime by
  // server-only modules and must never appear in this block.
  env: {
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
