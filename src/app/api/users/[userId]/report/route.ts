import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  if (userId === session.user.id) return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });

  const { reason, details } = await req.json();
  if (!reason) return NextResponse.json({ error: "Reason required" }, { status: 400 });

  await db.report.create({
    data: {
      reporterId: session.user.id,
      reportedId: userId,
      reason,
      details: details ?? null,
    },
  });

  return NextResponse.json({ reported: true });
}
