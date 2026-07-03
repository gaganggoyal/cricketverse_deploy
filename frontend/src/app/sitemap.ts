// src/app/sitemap.ts — Next.js sitemap generator
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://cricketverse.app'
  const now  = new Date()

  const static_pages = [
    { url: base,              priority: 1.0,  changeFrequency: 'daily'   },
    { url: `${base}/setup`,   priority: 0.95, changeFrequency: 'weekly'  },
    { url: `${base}/billing`, priority: 0.8,  changeFrequency: 'monthly' },
    { url: `${base}/leaderboard`, priority: 0.85, changeFrequency: 'daily' },
    { url: `${base}/fantasy`, priority: 0.8,  changeFrequency: 'weekly'  },
    { url: `${base}/tournament`, priority: 0.8, changeFrequency: 'weekly' },
    { url: `${base}/coach`,   priority: 0.75, changeFrequency: 'weekly'  },
    { url: `${base}/multiplayer`, priority: 0.85, changeFrequency: 'weekly' },
    { url: `${base}/analytics`, priority: 0.6, changeFrequency: 'weekly' },
    { url: `${base}/privacy`, priority: 0.3,  changeFrequency: 'yearly'  },
    { url: `${base}/terms`,   priority: 0.3,  changeFrequency: 'yearly'  },
  ]

  return static_pages.map(p => ({
    url:             p.url,
    lastModified:    now,
    changeFrequency: p.changeFrequency as any,
    priority:        p.priority,
  }))
}
