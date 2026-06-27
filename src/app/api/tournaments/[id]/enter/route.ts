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

  const tournament = await db.tournament.findUnique({
    where: { id },
    include: { _count: { select: { entrants: true } } },
  });

  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tournament.status !== "REGISTRATION") return NextResponse.json({ error: "Registration is closed" }, { status: 400 });
  if (tournament._count.entrants >= tournament.maxEntrants) return NextResponse.json({ error: "Tournament is full" }, { status: 400 });

  const existing = await db.tournamentEntrant.findUnique({
    where: { tournamentId_userId: { tournamentId: id, userId: session.user.id } },
  });
  if (existing) return NextResponse.json({ error: "Already entered" }, { status: 409 });

  const entrant = await db.tournamentEntrant.create({
    data: { tournamentId: id, userId: session.user.id },
  });

  return NextResponse.json(entrant, { status: 201 });
}
