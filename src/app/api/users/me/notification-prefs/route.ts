import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export interface NotificationPrefs {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  battleResults: boolean;
  gifts: boolean;
  crew: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  likes: true,
  comments: true,
  follows: true,
  battleResults: true,
  gifts: true,
  crew: true,
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  });

  const prefs = { ...DEFAULT_PREFS, ...(user?.notificationPrefs as Partial<NotificationPrefs> ?? {}) };
  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Only allow known keys
  const allowed: (keyof NotificationPrefs)[] = ["likes", "comments", "follows", "battleResults", "gifts", "crew"];
  const update: Partial<NotificationPrefs> = {};
  for (const key of allowed) {
    if (typeof body[key] === "boolean") update[key] = body[key];
  }

  // Merge with existing prefs
  const existing = await db.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  });

  const merged = {
    ...DEFAULT_PREFS,
    ...(existing?.notificationPrefs as Partial<NotificationPrefs> ?? {}),
    ...update,
  };

  await db.user.update({
    where: { id: session.user.id },
    data: { notificationPrefs: merged },
  });

  return NextResponse.json(merged);
}
