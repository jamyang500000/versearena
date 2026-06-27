import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { spendCoins, earnCoins } from "@/lib/coins";

const TIER_COSTS = {
  SUPPORTER: 50,
  SUPERFAN: 150,
  RIDE_OR_DIE: 500,
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subs = await db.fanSubscription.findMany({
    where: { fanId: session.user.id, active: true },
    include: {
      creator: { select: { id: true, name: true, username: true, image: true } },
    },
  });
  return NextResponse.json(subs);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { creatorId, tier } = await req.json();

  if (session.user.id === creatorId) {
    return NextResponse.json({ error: "Cannot subscribe to yourself" }, { status: 400 });
  }

  const cost = TIER_COSTS[tier as keyof typeof TIER_COSTS];
  if (!cost) return NextResponse.json({ error: "Invalid tier" }, { status: 400 });

  // Deduct coins
  const spend = await spendCoins(session.user.id, cost, "SPENT_GIFT", `Subscription: ${tier}`);
  if (!spend.success) {
    return NextResponse.json({ error: "Not enough coins" }, { status: 402 });
  }

  // Give creator 70% of sub cost
  await earnCoins(creatorId, Math.floor(cost * 0.7), "SUBSCRIPTION_REWARD", `Fan subscription received`);

  // Upsert subscription
  const sub = await db.fanSubscription.upsert({
    where: { fanId_creatorId: { fanId: session.user.id, creatorId } },
    create: {
      fanId: session.user.id,
      creatorId,
      tier,
      active: true,
      renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      tier,
      active: true,
      renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Notify creator
  const fan = await db.user.findUnique({ where: { id: session.user.id }, select: { username: true } });
  await db.notification.create({
    data: {
      userId: creatorId,
      type: "SUBSCRIPTION",
      message: `${fan?.username} subscribed to you as a ${tier}!`,
      link: `/profile/${fan?.username}`,
    },
  });

  return NextResponse.json(sub, { status: 201 });
}
