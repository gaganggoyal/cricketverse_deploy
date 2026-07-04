// Serves /ads.txt — required by AdSense to verify the site is authorized
// to sell its own ad inventory. Derived from the publisher id so there is
// no second place to keep in sync; 404 until AdSense is configured.
export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT // e.g. ca-pub-1234567890
  if (!client) return new Response('Not configured', { status: 404 })
  const pub = client.replace(/^ca-/, '') // ads.txt wants pub-…, not ca-pub-…
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
