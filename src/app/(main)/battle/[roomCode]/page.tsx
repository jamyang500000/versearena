import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import LiveBattleRoom from "@/components/battle/LiveBattleRoom";
import type { BattleWithUsers } from "@/types";

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function BattleRoomPage({ params }: PageProps) {
  const { roomCode } = await params;
  const session = await auth();

  const battle = await db.battle.findUnique({
    where: { roomCode },
    include: {
      challenger: { select: { id: true, name: true, username: true, image: true } },
      opponent: { select: { id: true, name: true, username: true, image: true } },
      _count: { select: { votes: true } },
    },
  });

  if (!battle) notFound();

  return (
    <LiveBattleRoom
      battle={battle as BattleWithUsers}
      currentUserId={session?.user?.id}
    />
  );
}
