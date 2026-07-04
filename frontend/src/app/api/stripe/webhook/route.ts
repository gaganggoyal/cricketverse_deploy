// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Clients are built per-request, not at module scope: `next build`
  // imports this file to collect route data, and constructing Stripe/
  // Supabase-admin with missing env keys crashes the whole build.
  const stripeKey  = process.env.STRIPE_SECRET_KEY
  const webhookSec = process.env.STRIPE_WEBHOOK_SECRET
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!stripeKey || !webhookSec || !serviceKey) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  }
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' })
  // Service-role Supabase client (bypasses RLS for webhook updates)
  const adminSupa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

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

      await adminSupa.from('user_profiles').upsert({
        id:                userId,
        plan,
        stripe_customer_id:    session.customer as string,
        stripe_subscription_id: subId,
        updated_at:        new Date().toISOString(),
      }, { onConflict: 'id' })
      break
    }

    case 'customer.subscription.deleted': {
      const sub    = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.user_id
      if (userId) {
        await adminSupa.from('user_profiles')
          .update({ plan: 'free', updated_at: new Date().toISOString() })
          .eq('id', userId)
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
