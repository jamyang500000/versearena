import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// GET /api/admin/users
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await db.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      image: true,
      coins: true,
      earningsCoins: true,
      wins: true,
      losses: true,
      createdAt: true,
      _count: { select: { posts: true, giftsSent: true, giftsReceived: true, payoutRequests: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}
