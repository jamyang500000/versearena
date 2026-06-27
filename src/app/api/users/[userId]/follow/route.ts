import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const followerId = session.user.id;

  if (followerId === userId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const existing = await db.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId: userId } },
  });

  if (existing) {
    await db.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  } else {
    const [, follower] = await Promise.all([
      db.follow.create({ data: { followerId, followingId: userId } }),
      db.user.findUnique({ where: { id: followerId }, select: { username: true } }),
    ]);

    // Notify the followed user (respects preferences)
    createNotification({
      userId,
      fromUserId: followerId,
      type: "FOLLOW",
      message: `@${follower?.username} started following you`,
      link: `/profile/${follower?.username}`,
    });

    return NextResponse.json({ following: true });
  }
}
