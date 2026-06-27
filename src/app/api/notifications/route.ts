import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        fromUser: { select: { id: true, name: true, username: true, image: true } },
      },
    }),
    db.notification.count({
      where: { userId: session.user.id, read: false },
    }),
  ]);

  // For old notifications without fromUser, extract name from message and batch-fetch
  const namesToLookup = new Set<string>();
  for (const n of notifications) {
    if (n.fromUser) continue;
    // Strip leading emojis/symbols before parsing
    const clean = n.message.replace(/^[^\w@]+/, "");
    const atMatch = clean.match(/^@(\w+)/);
    if (atMatch) { namesToLookup.add(`@${atMatch[1]}`); continue; }
    const nameMatch = clean.match(/^(.+?)\s+sent you/);
    if (nameMatch) namesToLookup.add(nameMatch[1]);
  }

  const fallbackMap: Record<string, { name: string | null; username: string; image: string | null }> = {};
  if (namesToLookup.size > 0) {
    const usernames = [...namesToLookup].filter(k => k.startsWith("@")).map(k => k.slice(1));
    const names = [...namesToLookup].filter(k => !k.startsWith("@"));

    const [byUsername, byName] = await Promise.all([
      usernames.length > 0
        ? db.user.findMany({ where: { username: { in: usernames } }, select: { username: true, name: true, image: true } })
        : [],
      names.length > 0
        ? db.user.findMany({ where: { name: { in: names } }, select: { username: true, name: true, image: true } })
        : [],
    ]);

    for (const u of byUsername) fallbackMap[`@${u.username}`] = u;
    for (const u of byName) if (u.name) fallbackMap[u.name] = u;
  }

  const enriched = notifications.map(n => {
    if (n.fromUser) return n;

    const clean = n.message.replace(/^[^\w@]+/, "");
    const atMatch = clean.match(/^@(\w+)/);
    const nameMatch = clean.match(/^(.+?)\s+sent you/);
    const key = atMatch ? `@${atMatch[1]}` : nameMatch ? nameMatch[1] : null;
    const fallback = key ? fallbackMap[key] ?? null : null;

    return { ...n, fromUser: fallback ?? null };
  });

  return NextResponse.json({ notifications: enriched, unreadCount });
}

export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
