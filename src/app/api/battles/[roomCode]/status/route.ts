import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;

  const battle = await db.battle.findUnique({
    where: { roomCode },
    select: {
      status: true,
      winnerId: true,
      opponentId: true,
      opponent: { select: { id: true, name: true, username: true, image: true } },
      _count: { select: { votes: true } },
    },
  });

  if (!battle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(battle);
}
