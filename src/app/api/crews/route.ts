import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/crews — list all crews with member count
export async function GET() {
  const crews = await db.crew.findMany({
    orderBy: { points: "desc" },
    include: {
      owner: { select: { id: true, name: true, username: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, username: true, image: true, wins: true } },
        },
        orderBy: { joinedAt: "asc" },
        take: 5,
      },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(crews);
}

// POST /api/crews — create a new crew
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // User can only be in one crew
  const existing = await db.crewMember.findUnique({ where: { userId: session.user.id } });
  if (existing) {
    return NextResponse.json({ error: "Leave your current crew first" }, { status: 409 });
  }

  const { name, tag, description } = await req.json();

  if (!name?.trim() || !tag?.trim()) {
    return NextResponse.json({ error: "Name and tag are required" }, { status: 400 });
  }

  const cleanTag = tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleanTag.length < 2 || cleanTag.length > 6) {
    return NextResponse.json({ error: "Tag must be 2–6 letters/numbers" }, { status: 400 });
  }

  const dupName = await db.crew.findUnique({ where: { name: name.trim() } });
  if (dupName) return NextResponse.json({ error: "Crew name already taken" }, { status: 409 });

  const dupTag = await db.crew.findUnique({ where: { tag: cleanTag } });
  if (dupTag) return NextResponse.json({ error: "Crew tag already taken" }, { status: 409 });

  const crew = await db.crew.create({
    data: {
      name: name.trim(),
      tag: cleanTag,
      description: description?.trim() || null,
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  return NextResponse.json(crew, { status: 201 });
}
