import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/battles — list live/waiting battles
export async function GET() {
  const battles = await db.battle.findMany({
    where: { status: { in: ["LIVE", "WAITING", "PENDING"] } },
    include: {
      challenger: { select: { id: true, name: true, username: true, image: true } },
      opponent: { select: { id: true, name: true, username: true, image: true } },
      _count: { select: { votes: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(battles);
}

// POST /api/battles — create a new battle challenge
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, challengedUserId } = await req.json();

  // Check if the challenged user allows challenges from this person
  if (challengedUserId) {
    const target = await db.user.findUnique({
      where: { id: challengedUserId },
      select: {
        challengePermission: true,
        followers: { where: { followerId: session.user.id }, select: { id: true } },
      },
    });

    if (target) {
      if (target.challengePermission === "NOBODY") {
        return NextResponse.json({ error: "This user is not accepting challenges" }, { status: 403 });
      }
      if (target.challengePermission === "FOLLOWERS_ONLY" && target.followers.length === 0) {
        return NextResponse.json({ error: "This user only accepts challenges from people they follow" }, { status: 403 });
      }
    }
  }

  const battle = await db.battle.create({
    data: {
      challengerId: session.user.id,
      title: title || null,
      status: "WAITING",
    },
  });

  const challenger = await db.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, name: true, followers: { select: { followerId: true } } },
  });

  if (challenger) {
    if (challengedUserId) {
      // Direct challenge — notify that specific person
      await db.notification.create({
        data: {
          userId: challengedUserId,
          type: "BATTLE_INVITE",
          message: `🎤 ${challenger.name ?? challenger.username} is challenging you to a rap battle! Accept the challenge!`,
          link: `/battle/${battle.roomCode}`,
        },
      });
    } else if (challenger.followers.length > 0) {
      // Open challenge — notify all followers
      await db.notification.createMany({
        data: challenger.followers.map((f) => ({
          userId: f.followerId,
          type: "BATTLE_INVITE",
          message: `🎤 ${challenger.name ?? challenger.username} just issued a battle challenge — come watch!`,
          link: `/battle/${battle.roomCode}`,
        })),
      });
    }
  }

  return NextResponse.json(battle, { status: 201 });
}
