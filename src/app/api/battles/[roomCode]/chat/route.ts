import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET messages by battleId (roomCode resolves to battle)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;

  const battle = await db.battle.findUnique({ where: { roomCode }, select: { id: true } });
  if (!battle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await db.chatMessage.findMany({
    where: { battleId: battle.id },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      user: { select: { username: true } },
    },
  });

  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      userId: m.userId,
      username: m.user.username,
      content: m.content,
      type: m.type,
      createdAt: m.createdAt,
    }))
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomCode } = await params;
  const { content } = await req.json();

  if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const battle = await db.battle.findUnique({ where: { roomCode }, select: { id: true } });
  if (!battle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const message = await db.chatMessage.create({
    data: {
      battleId: battle.id,
      userId: session.user.id,
      content: content.trim().slice(0, 200),
      type: "TEXT",
    },
    include: { user: { select: { username: true } } },
  });

  return NextResponse.json({
    id: message.id,
    userId: message.userId,
    username: message.user.username,
    content: message.content,
    type: message.type,
    createdAt: message.createdAt,
  });
}
