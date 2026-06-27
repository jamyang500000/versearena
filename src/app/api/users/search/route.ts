import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const users = await db.user.findMany({
    where: q && q.length > 0 ? {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    } : {},
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      bio: true,
      wins: true,
      points: true,
      _count: { select: { followers: true, following: true } },
    },
    take: 20,
  });

  // If logged in, attach following status for each result
  if (session?.user?.id) {
    const myFollows = await db.follow.findMany({
      where: {
        followerId: session.user.id,
        followingId: { in: users.map((u) => u.id) },
      },
      select: { followingId: true },
    });
    const followingSet = new Set(myFollows.map((f) => f.followingId));

    return NextResponse.json(
      users.map((u) => ({ ...u, isFollowing: followingSet.has(u.id) }))
    );
  }

  return NextResponse.json(users.map((u) => ({ ...u, isFollowing: false })));
}
