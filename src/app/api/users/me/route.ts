import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, username: true, email: true,
      bio: true, image: true, coins: true, wins: true, losses: true, points: true,
      password: true,
      ranking: true,
      accounts: { select: { provider: true } },
      crewMember: { include: { crew: true } },
      _count: { select: { followers: true, following: true, posts: true } },
    },
  });

  // Don't expose the password hash — just whether one exists
  const { password, ...rest } = user ?? {};
  const safeUser = user ? { ...rest, hasPassword: !!password } : null;

  return NextResponse.json(safeUser);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, username, bio, image } = await req.json();

  if (username) {
    const existing = await db.user.findFirst({
      where: { username, NOT: { id: session.user.id } },
    });
    if (existing) return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(username !== undefined && { username }),
      ...(bio !== undefined && { bio }),
      ...(image !== undefined && { image }),
    },
    select: { id: true, name: true, username: true, bio: true, image: true },
  });

  return NextResponse.json(user);
}

// DELETE /api/users/me — permanently delete the account
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.user.id;

  // Verify password before deleting
  const { password } = await req.json();
  if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: uid }, select: { password: true } });
  if (!user?.password) {
    return NextResponse.json({ error: "No password set — sign in with Google to delete" }, { status: 400 });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

  // Handle non-cascade relations before deleting the user
  await db.$transaction([
    // Battles where user is the challenger — delete entirely (votes/chat/gifts cascade from battle)
    db.battle.deleteMany({ where: { challengerId: uid } }),

    // Battles where user is opponent — remove them as opponent, revert to WAITING
    db.battle.updateMany({
      where: { opponentId: uid },
      data: { opponentId: null, status: "WAITING" },
    }),

    // Battles where user is the winner — clear winner
    db.battle.updateMany({
      where: { winnerId: uid },
      data: { winnerId: null },
    }),

    // Tournaments where user is the winner — clear winner
    db.tournament.updateMany({
      where: { winnerId: uid },
      data: { winnerId: null },
    }),

    // AI judgements where user is the declared winner — delete the judgement
    db.aIJudgement.deleteMany({ where: { winnerId: uid } }),

    // Crews owned by user — delete (members cascade)
    db.crew.deleteMany({ where: { ownerId: uid } }),

    // Finally delete the user — all cascade relations fire here
    db.user.delete({ where: { id: uid } }),
  ]);

  return NextResponse.json({ deleted: true });
}
