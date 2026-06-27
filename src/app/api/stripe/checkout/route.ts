import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { COIN_PACKAGES } from "@/lib/coin-packages";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripeReady = stripeKey && !stripeKey.includes("REPLACE_ME");

export async function POST(req: Request) {
  if (!stripeReady) {
    return NextResponse.json({ error: "Payments not available yet" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { packageId } = await req.json();
  const pkg = COIN_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey!, { apiVersion: "2026-06-24.dahlia" });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(pkg.priceUsd * 100), // cents
          product_data: {
            name: `${pkg.coins} VerseArena Coins — ${pkg.label}`,
            description: pkg.description,
            images: [],
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: session.user.id,
      packageId: pkg.id,
      coins: pkg.coins.toString(),
    },
    success_url: `${appUrl}/coins/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/coins`,
  });

  return NextResponse.json({ url: checkoutSession.url}); 
}
