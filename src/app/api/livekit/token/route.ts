import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AccessToken } from "livekit-server-sdk";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomCode } = await req.json();

  const battle = await db.battle.findUnique({
    where: { roomCode },
    include: {
      challenger: { select: { id: true, username: true } },
      opponent: { select: { id: true, username: true } },
    },
  });

  if (!battle) {
    return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isParticipant =
    session.user.id === battle.challengerId ||
    session.user.id === battle.opponentId;

  const roomName = battle.livekitRoomName ?? `battle-${roomCode}`;

  // Save room name to battle if not already set
  if (!battle.livekitRoomName) {
    await db.battle.update({
      where: { roomCode },
      data: { livekitRoomName: roomName },
    });
  }

  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: session.user.id,
    name: user.username,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: isParticipant,       // only battlers can publish audio/video
    canSubscribe: true,               // everyone can watch
    canPublishData: true,             // everyone can send chat data
  });

  const jwt = await token.toJwt();

  return NextResponse.json({ token: jwt, roomName, isParticipant });
}
