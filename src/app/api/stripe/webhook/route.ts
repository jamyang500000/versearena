import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-06-24.dahlia" });

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, coins } = session.metadata ?? {};

    if (!userId || !coins) return NextResponse.json({ error: "Missing metadata" }, { status: 400 });

    const coinAmount = parseInt(coins);

    // Credit coins to user
    await db.user.update({
      where: { id: userId },
      data: { coins: { increment: coinAmount } },
    });

    // Log the transaction
    await db.coinTransaction.create({
      data: {
        userId,
        amount: coinAmount,
        type: "PURCHASED",
        note: `Purchased ${coinAmount} coins via Stripe (session: ${session.id})`,
      },
    });
  }

  return NextResponse.json({ received: true });
}
