import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/payout-requests — user's own payout requests
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await db.payoutRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { coins: true, earningsCoins: true },
  });

  return NextResponse.json({ requests, coins: user?.coins ?? 0, earningsCoins: user?.earningsCoins ?? 0 });
}

// POST /api/payout-requests — submit a new payout request
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { coins, note } = await req.json();

  if (!coins || coins < 100) {
    return NextResponse.json({ error: "Minimum payout is 100 coins" }, { status: 400 });
  }

  // Check user has enough earningsCoins
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { earningsCoins: true },
  });

  if (!user || user.earningsCoins < coins) {
    return NextResponse.json({ error: "Not enough earnings coins" }, { status: 400 });
  }

  // Check no pending request already exists
  const pending = await db.payoutRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
  });
  if (pending) {
    return NextResponse.json({ error: "You already have a pending payout request" }, { status: 400 });
  }

  // Deduct earningsCoins (hold them while pending)
  await db.user.update({
    where: { id: session.user.id },
    data: { earningsCoins: { decrement: coins } },
  });

  const request = await db.payoutRequest.create({
    data: {
      userId: session.user.id,
      coins,
      note: note ?? null,
    },
  });

  return NextResponse.json(request);
}
