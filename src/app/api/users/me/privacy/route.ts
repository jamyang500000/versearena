import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { privateProfile: true, challengePermission: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { privateProfile, challengePermission } = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof privateProfile === "boolean") data.privateProfile = privateProfile;
  if (["EVERYONE", "FOLLOWERS_ONLY", "NOBODY"].includes(challengePermission)) {
    data.challengePermission = challengePermission;
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data,
    select: { privateProfile: true, challengePermission: true },
  });

  return NextResponse.json(user);
}
