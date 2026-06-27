import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ postId: string }> };

const userSelect = { id: true, name: true, username: true, image: true };

export async function GET(_req: Request, { params }: Params) {
  const { postId } = await params;

  // Fetch top-level comments with nested replies (one level deep)
  const comments = await db.comment.findMany({
    where: { postId, parentId: null },
    include: {
      user: { select: userSelect },
      replies: {
        include: { user: { select: userSelect } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  const { content, parentId } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Empty comment" }, { status: 400 });

  const [comment, post] = await Promise.all([
    db.comment.create({
      data: {
        postId,
        userId: session.user.id,
        content: content.trim(),
        parentId: parentId ?? null,
      },
      include: {
        user: { select: userSelect },
        replies: { include: { user: { select: userSelect } } },
      },
    }),
    db.post.findUnique({ where: { id: postId }, select: { userId: true } }),
  ]);

  // Notify post owner (respects preferences)
  if (post && post.userId !== session.user.id) {
    createNotification({
      userId: post.userId,
      fromUserId: session.user.id,
      type: "COMMENT",
      message: `@${comment.user.username} commented: "${content.trim().slice(0, 50)}"`,
      link: `/post/${postId}`,
    });
  }

  return NextResponse.json(comment, { status: 201 });
}
