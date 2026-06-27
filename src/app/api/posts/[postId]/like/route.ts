import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  const userId = session.user.id;

  const existing = await db.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await db.like.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  } else {
    // Create like + notify post owner (fire-and-forget)
    const [, post] = await Promise.all([
      db.like.create({ data: { userId, postId } }),
      db.post.findUnique({ where: { id: postId }, select: { userId: true } }),
    ]);

    if (post && post.userId !== userId) {
      const liker = await db.user.findUnique({ where: { id: userId }, select: { username: true } });
      createNotification({
        userId: post.userId,
        fromUserId: userId,
        type: "LIKE",
        message: `@${liker?.username} liked your post`,
        link: `/post/${postId}`,
      });
    }

    return NextResponse.json({ liked: true });
  }
}
