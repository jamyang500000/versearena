import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomCode } = await params;

  const battle = await db.battle.findUnique({ where: { roomCode } });
  if (!battle) {
    return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  }
  if (battle.opponentId) {
    return NextResponse.json({ error: "Battle already has an opponent" }, { status: 409 });
  }
  if (battle.challengerId === session.user.id) {
    return NextResponse.json({ error: "You created this battle" }, { status: 400 });
  }

  const opponent = await db.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, name: true },
  });

  const updated = await db.battle.update({
    where: { roomCode },
    data: {
      opponentId: session.user.id,
      status: "LIVE",
      startedAt: new Date(),
    },
  });

  // Notify the challenger that someone accepted
  await db.notification.create({
    data: {
      userId: battle.challengerId,
      type: "BATTLE_INVITE",
      message: `🔥 ${opponent?.name ?? opponent?.username ?? "Someone"} accepted your challenge — battle is LIVE!`,
      link: `/battle/${roomCode}`,
    },
  });

  return NextResponse.json(updated);
}
