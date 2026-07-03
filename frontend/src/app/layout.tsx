import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })
const APP_URL = 'https://cricketverse.app'
const APP_DESC = 'AI cricket match simulator with 200+ real players. Watch any match live in 3D — ball-by-ball from real career stats. Free to start.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: 'QuickCric — AI Cricket Match Simulator', template: '%s | QuickCric' },
  description: APP_DESC,
  keywords: ['cricket simulator','AI cricket','fantasy cricket','T20 cricket','Virat Kohli','IPL simulator'],
  openGraph: {
    type: 'website', siteName: 'QuickCric', title: 'QuickCric — AI Cricket Match Simulator',
    description: APP_DESC, images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', creator: '@cricketverse', images: [`${APP_URL}/og-image.png`] },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  icons: { icon: '/icons/icon-32.png', apple: '/icons/icon-180.png' },
}
export const viewport: Viewport = { themeColor: '#0a0f0d', colorScheme: 'dark' }

const jsonLd = {
  '@context': 'https://schema.org', '@type': 'WebApplication',
  name: 'QuickCric', url: APP_URL, description: APP_DESC,
  applicationCategory: 'SportsApplication',
  offers: { '@type': 'AggregateOffer', lowPrice: '0', highPrice: '799', priceCurrency: 'INR' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
