import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Returns combined followers + following (deduplicated) for the challenge picker
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const [followers, following] = await Promise.all([
    db.follow.findMany({
      where: { followingId: session.user.id },
      include: { follower: { select: { id: true, name: true, username: true, image: true } } },
    }),
    db.follow.findMany({
      where: { followerId: session.user.id },
      include: { following: { select: { id: true, name: true, username: true, image: true } } },
    }),
  ]);

  // Merge and deduplicate
  const map = new Map<string, { id: string; name: string | null; username: string; image: string | null }>();
  followers.forEach(f => map.set(f.follower.id, f.follower));
  following.forEach(f => map.set(f.following.id, f.following));

  // Remove self just in case
  map.delete(session.user.id);

  return NextResponse.json(Array.from(map.values()));
}
