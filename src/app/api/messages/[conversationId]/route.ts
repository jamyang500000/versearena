import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ conversationId: string }> };

// GET /api/messages/[conversationId] — fetch messages + mark as read
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  const userId = session.user.id;

  const conv = await db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ participantAId: userId }, { participantBId: userId }],
    },
  });
  if (!conv) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [messages] = await Promise.all([
    db.directMessage.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true, username: true, image: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.directMessage.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    }),
  ]);

  return NextResponse.json(messages);
}

// POST /api/messages/[conversationId] — send a message
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  const userId = session.user.id;
  const body = await req.json();
  const { content, messageType = "TEXT", audioUrl, imageUrl, audioDuration } = body;

  if (messageType === "TEXT" && !content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  if (messageType === "AUDIO" && !audioUrl) return NextResponse.json({ error: "No audio" }, { status: 400 });
  if (messageType === "IMAGE" && !imageUrl) return NextResponse.json({ error: "No image" }, { status: 400 });

  const conv = await db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ participantAId: userId }, { participantBId: userId }],
    },
  });
  if (!conv) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [message] = await Promise.all([
    db.directMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content: content?.trim() ?? null,
        messageType,
        audioUrl: audioUrl ?? null,
        imageUrl: imageUrl ?? null,
        audioDuration: audioDuration ?? null,
      },
      include: { sender: { select: { id: true, name: true, username: true, image: true } } },
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  db.user
    .findUnique({ where: { id: userId }, select: { name: true, username: true } })
    .then(sender => {
      const notifMessage =
        messageType === "AUDIO"
          ? `🎤 ${sender?.name ?? sender?.username} sent you a voice message`
          : messageType === "IMAGE"
          ? `📷 ${sender?.name ?? sender?.username} sent you a photo`
          : `💬 ${sender?.name ?? sender?.username} sent you a message`;
      return db.notification.create({
        data: { userId: receiverId, type: "FOLLOW", message: notifMessage, link: `/messages/${conversationId}` },
      });
    })
    .catch(() => {});

  return NextResponse.json(message, { status: 201 });
}
