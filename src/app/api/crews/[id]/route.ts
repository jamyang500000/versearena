import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/crews/[id] — crew detail with all members
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const crew = await db.crew.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, username: true, image: true } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              wins: true,
              losses: true,
              points: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
      _count: { select: { members: true } },
    },
  });

  if (!crew) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(crew);
}
