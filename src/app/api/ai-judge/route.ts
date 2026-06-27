import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { judgeAuto } from "@/lib/ai-judge";
import { awardPoints, POINTS } from "@/lib/rankings";
import { earnCoins } from "@/lib/coins";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomCode, challengerLyrics, opponentLyrics, provider } = await req.json();

  const battle = await db.battle.findUnique({
    where: { roomCode },
    include: {
      challenger: { select: { id: true, name: true, username: true } },
      opponent: { select: { id: true, name: true, username: true } },
      aiJudgement: true,
    },
  });

  if (!battle) return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  if (battle.aiJudgement) return NextResponse.json(battle.aiJudgement);
  if (!battle.opponent) return NextResponse.json({ error: "Battle has no opponent" }, { status: 400 });

  // Only participants can trigger AI judging
  if (session.user.id !== battle.challengerId && session.user.id !== battle.opponentId) {
    return NextResponse.json({ error: "Only participants can request AI judging" }, { status: 403 });
  }

  const result = await judgeAuto(
    { userId: battle.challengerId, name: battle.challenger.name ?? battle.challenger.username, lyrics: challengerLyrics },
    { userId: battle.opponentId!, name: battle.opponent.name ?? battle.opponent.username, lyrics: opponentLyrics },
    provider ?? "claude"
  );

  // Save judgement
  const judgement = await db.aIJudgement.create({
    data: {
      battleId: battle.id,
      provider: result.provider,
      winnerId: result.winnerId,
      analysis: result.analysis,
      scores: result.scores as object,
    },
  });

  // Update battle winner & status
  await db.battle.update({
    where: { id: battle.id },
    data: { status: "ENDED", winnerId: result.winnerId, endedAt: new Date() },
  });

  const loserId = result.winnerId === battle.challengerId ? battle.opponentId! : battle.challengerId;

  // Award points & coins
  await awardPoints(result.winnerId, POINTS.WIN);
  await awardPoints(loserId, POINTS.LOSS);
  await db.user.update({ where: { id: result.winnerId }, data: { wins: { increment: 1 } } });
  await db.user.update({ where: { id: loserId }, data: { losses: { increment: 1 } } });
  await earnCoins(result.winnerId, 200, "EARNED_WIN", "Battle win bonus");

  // Notify both
  await db.notification.createMany({
    data: [
      {
        userId: result.winnerId,
        type: "BATTLE_RESULT",
        message: `🏆 AI Judge declared you the winner! ${result.analysis}`,
        link: `/battle/${roomCode}`,
      },
      {
        userId: loserId,
        type: "BATTLE_RESULT",
        message: `Battle ended. AI Judge: "${result.analysis}"`,
        link: `/battle/${roomCode}`,
      },
    ],
  });

  return NextResponse.json({ judgement, result });
}
