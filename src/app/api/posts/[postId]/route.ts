import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ postId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const { postId } = await params;
  const userId = session?.user?.id;

  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
      _count: { select: { likes: true, comments: true } },
      ...(userId ? { likes: { where: { userId }, select: { id: true } } } : {}),
    },
  });

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...post,
    isLiked: Array.isArray((post as any).likes) && (post as any).likes.length > 0,
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.post.delete({ where: { id: postId } });
  return NextResponse.json({ success: true });
}
