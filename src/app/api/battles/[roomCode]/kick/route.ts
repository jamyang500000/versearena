import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Challenger kicks the opponent out of the battle slot
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomCode } = await params;

  const battle = await db.battle.findUnique({ where: { roomCode } });
  if (!battle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the challenger (room owner) can kick
  if (session.user.id !== battle.challengerId) {
    return NextResponse.json({ error: "Only the battle creator can kick" }, { status: 403 });
  }

  if (!battle.opponentId) {
    return NextResponse.json({ error: "No opponent to kick" }, { status: 400 });
  }

  if (battle.status !== "LIVE") {
    return NextResponse.json({ error: "Can only kick during LIVE battle" }, { status: 400 });
  }

  await db.battle.update({
    where: { roomCode },
    data: { opponentId: null },
  });

  // Notify the kicked user
  await db.notification.create({
    data: {
      userId: battle.opponentId,
      type: "BATTLE_RESULT",
      message: "You were removed from the battle.",
      link: `/battle`,
    },
  });

  return NextResponse.json({ kicked: true });
}
