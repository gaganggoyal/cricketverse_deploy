// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { execute } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Stripe is built per-request, not at module scope: `next build` imports
  // this file to collect route data, and constructing it with a missing
  // key crashes the whole build.
  //
  // The service-role Supabase client this used to need is gone: the route
  // runs on the server and talks to MySQL directly, and there is no RLS to
  // bypass. Authenticity comes from the Stripe signature check below —
  // this endpoint is unauthenticated by design.
  const stripeKey  = process.env.STRIPE_SECRET_KEY
  const webhookSec = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeKey || !webhookSec) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  }
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' })

  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSec)
  } catch (e: any) {
    return NextResponse.json({ error: `Webhook error: ${e.message}` }, { status: 400 })
  }

  const PLAN_MAP: Record<string, string> = {
    [process.env.STRIPE_PRO_PRICE_ID   ?? '']:  'pro',
    [process.env.STRIPE_ELITE_PRICE_ID ?? '']:  'elite',
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session    = event.data.object as Stripe.Checkout.Session
      const userId     = session.metadata?.user_id
      const subId      = session.subscription as string
      if (!userId) break

      const sub   = await stripe.subscriptions.retrieve(subId)
      const priceId    = sub.items.data[0]?.price.id
      const plan       = PLAN_MAP[priceId] ?? 'pro'

      // UPDATE, not upsert: the profile row is created with the account,
      // and a payment for an id with no user must not conjure one.
      await execute(
        `UPDATE user_profiles
            SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ?
          WHERE id = ?`,
        [plan, session.customer as string, subId, userId]
      )
      break
    }

    case 'customer.subscription.deleted': {
      const sub    = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.user_id
      if (userId) {
        await execute(`UPDATE user_profiles SET plan = 'free' WHERE id = ?`, [userId])
      }
      break
    }

    case 'invoice.payment_failed': {
      // Optional: notify user their payment failed
      const invoice = event.data.object as Stripe.Invoice
      console.warn(`Payment failed for customer: ${invoice.customer}`)
      break
    }
  }

  return NextResponse.json({ received: true })
}
