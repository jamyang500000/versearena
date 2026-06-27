import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await db.crewMember.findUnique({ where: { userId: session.user.id } });
  if (existing) return NextResponse.json({ error: "Already in a crew" }, { status: 409 });

  const crew = await db.crew.findUnique({ where: { id } });
  if (!crew) return NextResponse.json({ error: "Crew not found" }, { status: 404 });

  const member = await db.crewMember.create({
    data: { crewId: id, userId: session.user.id, role: "MEMBER" },
  });

  return NextResponse.json(member, { status: 201 });
}
