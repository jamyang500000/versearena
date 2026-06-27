import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { awardPoints, POINTS } from "@/lib/rankings";
import { earnCoins } from "@/lib/coins";

// End a battle by crowd vote tally
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomCode } = await params;

  const battle = await db.battle.findUnique({
    where: { roomCode },
    include: {
      votes: true,
      challenger: { select: { id: true, username: true } },
      opponent: { select: { id: true, username: true } },
    },
  });

  if (!battle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (battle.status === "ENDED") return NextResponse.json({ error: "Already ended" }, { status: 400 });

  // Only participants can end
  if (session.user.id !== battle.challengerId && session.user.id !== battle.opponentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Tally votes
  const voteCounts: Record<string, number> = {};
  for (const vote of battle.votes) {
    voteCounts[vote.votedFor] = (voteCounts[vote.votedFor] ?? 0) + 1;
  }

  const entries = Object.entries(voteCounts);
  let winnerId: string | null = null;

  if (entries.length > 0) {
    entries.sort((a, b) => b[1] - a[1]);
    if (entries[0][1] !== entries[1]?.[1]) {
      winnerId = entries[0][0];
    }
    // Tied = no winner
  }

  await db.battle.update({
    where: { roomCode },
    data: { status: "ENDED", winnerId, endedAt: new Date() },
  });

  if (winnerId) {
    const loserId =
      winnerId === battle.challengerId ? battle.opponentId! : battle.challengerId;

    await awardPoints(winnerId, POINTS.WIN);
    await awardPoints(loserId, POINTS.LOSS);
    await db.user.update({ where: { id: winnerId }, data: { wins: { increment: 1 } } });
    await db.user.update({ where: { id: loserId }, data: { losses: { increment: 1 } } });
    await earnCoins(winnerId, 200, "EARNED_WIN", "Battle win");

    // Notify both
    const winner = winnerId === battle.challengerId ? battle.challenger : battle.opponent;
    const loser = winnerId === battle.challengerId ? battle.opponent : battle.challenger;

    await db.notification.createMany({
      data: [
        {
          userId: winnerId,
          type: "BATTLE_RESULT",
          message: `🏆 You won the battle! +100 points, +200 coins.`,
          link: `/battle/${roomCode}`,
        },
        ...(loser
          ? [{
              userId: loser.id,
              type: "BATTLE_RESULT" as const,
              message: `Battle ended. ${winner?.username ?? "Opponent"} won by crowd vote.`,
              link: `/battle/${roomCode}`,
            }]
          : []),
      ],
    });

    // Award ranking points to voters
    await db.battleVote.updateMany({ where: { battleId: battle.id }, data: {} });
    const voterIds = battle.votes.map((v) => v.userId);
    await Promise.all(voterIds.map((vid) => awardPoints(vid, POINTS.VOTE_CAST)));
  }

  return NextResponse.json({ ended: true, winnerId, voteCounts });
}

// Move battle to voting phase
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomCode } = await params;
  const battle = await db.battle.findUnique({ where: { roomCode } });

  if (!battle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.id !== battle.challengerId && session.user.id !== battle.opponentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await db.battle.update({
    where: { roomCode },
    data: { status: "VOTING" },
  });

  return NextResponse.json(updated);
}
