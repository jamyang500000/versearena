import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const rankings = await db.ranking.findMany({
    orderBy: { points: "desc" },
    take: limit,
    include: {
      user: {
        select: { id: true, name: true, username: true, image: true, wins: true, losses: true },
      },
    },
  });

  // assign live ranks
  const ranked = rankings.map((r, i) => ({ ...r, rank: i + 1 }));
  return NextResponse.json(ranked);
}
