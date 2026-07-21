// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { currentUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Per-request, not module scope: `next build` imports this file, and
    // constructing Stripe without a key crashes the build.
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' })

    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { priceId } = await req.json()

    const session = await stripe.checkout.sessions.create({
      mode:               'subscription',
      payment_method_types: ['card'],
      line_items:         [{ price: priceId, quantity: 1 }],
      success_url:        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=1`,
      cancel_url:         `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
      customer_email:     user.email,
      metadata:           { user_id: user.id },
      subscription_data:  { metadata: { user_id: user.id } },
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
