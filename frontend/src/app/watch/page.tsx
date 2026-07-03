'use client'
/**
 * /watch — Live 3D TV Broadcast Match Viewer
 * Embeds the full standalone 3D match experience (Three.js stadium,
 * animated players, broadcast HUD, auto cameras, crowd wave, sound).
 * Served from /public/match3d.html so it works with zero build config.
 */
import { useRouter } from 'next/navigation'

export default function WatchPage() {
  const router = useRouter()
  return (
    <div className="fixed inset-0 bg-black">
      <iframe
        src="/match3d.html"
        title="QuickCric Live 3D Match"
        className="w-full h-full border-0"
        allow="autoplay"
      />
      <button
        onClick={() => router.push('/dashboard')}
        className="absolute top-3 right-3 z-50 text-xs px-3 py-1.5 rounded-lg bg-black/70 border border-white/15 text-white/70 hover:text-white transition-colors"
      >
        ← Exit to dashboard
      </button>
    </div>
  )
}
