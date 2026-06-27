import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/posts — paginated feed
export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const take = 10;

  const posts = await db.post.findMany({
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
      _count: { select: { likes: true, comments: true } },
      ...(userId ? { likes: { where: { userId }, select: { id: true } } } : {}),
    },
  });

  // Get which post authors this user already follows (one query)
  let followingSet = new Set<string>();
  if (userId && posts.length > 0) {
    const authorIds = [...new Set(posts.map(p => p.userId))];
    const follows = await db.follow.findMany({
      where: { followerId: userId, followingId: { in: authorIds } },
      select: { followingId: true },
    });
    followingSet = new Set(follows.map(f => f.followingId));
  }

  const nextCursor = posts.length === take ? posts[posts.length - 1].id : null;

  return NextResponse.json({
    posts: posts.map(p => ({
      ...p,
      isLiked: Array.isArray((p as any).likes) && (p as any).likes.length > 0,
      isFollowing: followingSet.has(p.userId),
    })),
    nextCursor,
  });
}

// POST /api/posts — create post after upload
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { videoUrl, caption } = await req.json();
  if (!videoUrl) return NextResponse.json({ error: "No video URL" }, { status: 400 });

  const post = await db.post.create({
    data: {
      userId: session.user.id,
      videoUrl,
      caption: caption?.trim() || null,
    },
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return NextResponse.json(post, { status: 201 });
}
