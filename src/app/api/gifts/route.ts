import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GIFT_CATALOG, spendCoins, earnCoins } from "@/lib/coins";
import { awardPoints, POINTS } from "@/lib/rankings";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { battleId, receiverId, giftType } = await req.json();

  const giftDef = GIFT_CATALOG.find((g) => g.type === giftType);
  if (!giftDef) {
    return NextResponse.json({ error: "Invalid gift type" }, { status: 400 });
  }

  // Check battle exists and is live
  const battle = await db.battle.findUnique({ where: { id: battleId } });
  if (!battle || battle.status !== "LIVE") {
    return NextResponse.json({ error: "Battle is not live" }, { status: 400 });
  }

  // Deduct coins from sender
  const spend = await spendCoins(session.user.id, giftDef.cost, "SPENT_GIFT", `Sent ${giftDef.label} gift`);
  if (!spend.success) {
    return NextResponse.json({ error: "Not enough coins" }, { status: 402 });
  }

  // Give coins to receiver (70% of gift value)
  const creatorShare = Math.floor(giftDef.cost * 0.7);
  await earnCoins(receiverId, creatorShare, "GIFTED_RECEIVED", `Received ${giftDef.label} gift`);

  // Also accumulate earningsCoins for payout tracking
  await db.user.update({
    where: { id: receiverId },
    data: { earningsCoins: { increment: creatorShare } },
  });

  // Award ranking points to receiver
  await awardPoints(receiverId, giftDef.cost * POINTS.GIFT_RECEIVED);

  // Save gift record
  const gift = await db.gift.create({
    data: {
      battleId,
      senderId: session.user.id,
      receiverId,
      giftType: giftType as never,
      coinCost: giftDef.cost,
    },
  });

  // Add chat message
  const sender = await db.user.findUnique({ where: { id: session.user.id }, select: { username: true } });
  const receiver = await db.user.findUnique({ where: { id: receiverId }, select: { username: true } });
  await db.chatMessage.create({
    data: {
      battleId,
      userId: session.user.id,
      content: `${sender?.username} sent ${giftDef.emoji} ${giftDef.label} to ${receiver?.username}!`,
      type: "GIFT",
    },
  });

  // Notify receiver
  await db.notification.create({
    data: {
      userId: receiverId,
      type: "GIFT_RECEIVED",
      message: `${sender?.username} sent you a ${giftDef.emoji} ${giftDef.label} (${giftDef.cost} coins)!`,
      link: `/battle/${battle.roomCode}`,
    },
  });

  return NextResponse.json({ gift, newBalance: spend.balance });
}
