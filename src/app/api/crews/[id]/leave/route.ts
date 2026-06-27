import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/crews/[id]/leave — leave a crew
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const crew = await db.crew.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });
  if (!crew) return NextResponse.json({ error: "Crew not found" }, { status: 404 });

  // Owner cannot leave — they must disband or transfer first
  if (crew.ownerId === session.user.id) {
    return NextResponse.json(
      { error: "You're the owner. Disband the crew or transfer ownership first." },
      { status: 403 }
    );
  }

  const membership = await db.crewMember.findUnique({ where: { userId: session.user.id } });
  if (!membership || membership.crewId !== id) {
    return NextResponse.json({ error: "You're not in this crew" }, { status: 404 });
  }

  await db.crewMember.delete({ where: { userId: session.user.id } });

  return NextResponse.json({ left: true });
}
