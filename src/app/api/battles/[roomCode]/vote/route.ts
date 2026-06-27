import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomCode } = await params;
  const { votedFor } = await req.json();

  const battle = await db.battle.findUnique({ where: { roomCode } });
  if (!battle || battle.status !== "VOTING") {
    return NextResponse.json({ error: "Voting is not active" }, { status: 400 });
  }

  // Battlers cannot vote
  if (session.user.id === battle.challengerId || session.user.id === battle.opponentId) {
    return NextResponse.json({ error: "Battlers cannot vote" }, { status: 403 });
  }

  const existing = await db.battleVote.findUnique({
    where: { battleId_userId: { battleId: battle.id, userId: session.user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already voted" }, { status: 409 });
  }

  const vote = await db.battleVote.create({
    data: { battleId: battle.id, userId: session.user.id, votedFor },
  });

  return NextResponse.json(vote, { status: 201 });
}
