import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/messages — list all conversations for current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const conversations = await db.conversation.findMany({
    where: {
      OR: [{ participantAId: userId }, { participantBId: userId }],
    },
    include: {
      participantA: { select: { id: true, name: true, username: true, image: true } },
      participantB: { select: { id: true, name: true, username: true, image: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, messageType: true, senderId: true },
      },
      // Unread count in a single join — no N+1
      _count: {
        select: { messages: true },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  // Get unread counts in one query instead of N separate queries
  const unreadCounts = await db.directMessage.groupBy({
    by: ["conversationId"],
    where: {
      isRead: false,
      senderId: { not: userId },
      conversationId: { in: conversations.map(c => c.id) },
    },
    _count: { id: true },
  });

  const unreadMap = new Map(unreadCounts.map(u => [u.conversationId, u._count.id]));

  const result = conversations.map(c => {
    const other = c.participantAId === userId ? c.participantB : c.participantA;
    const lastMsg = c.messages[0];
    // Build preview text based on message type
    let preview = "Start a conversation";
    if (lastMsg) {
      if (lastMsg.messageType === "AUDIO") preview = "🎤 Voice message";
      else if (lastMsg.messageType === "IMAGE") preview = "📷 Photo";
      else preview = lastMsg.content ?? "";
    }
    return {
      id: c.id,
      other,
      unread: unreadMap.get(c.id) ?? 0,
      lastMessageAt: c.lastMessageAt,
      preview,
    };
  });

  return NextResponse.json(result);
}

// POST /api/messages — start or get a conversation with someone
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: otherUserId } = await req.json();
  if (!otherUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (otherUserId === session.user.id) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

  const [a, b] = [session.user.id, otherUserId].sort();

  let conversation = await db.conversation.findUnique({
    where: { participantAId_participantBId: { participantAId: a, participantBId: b } },
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: { participantAId: a, participantBId: b },
    });
  }

  return NextResponse.json(conversation);
}
