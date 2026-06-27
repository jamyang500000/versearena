import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// GET /api/admin/payout-requests — all payout requests
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requests = await db.payoutRequest.findMany({
    include: {
      user: { select: { id: true, username: true, email: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}
