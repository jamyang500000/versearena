import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// PATCH /api/admin/payout-requests/[id]
// body: { status: "APPROVED" | "REJECTED" | "PAID", adminNote?: string }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { status, adminNote } = await req.json();

  const allowed = ["APPROVED", "REJECTED", "PAID"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const payout = await db.payoutRequest.findUnique({ where: { id } });
  if (!payout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If rejecting a PENDING request, refund the earningsCoins to the user
  if (status === "REJECTED" && payout.status === "PENDING") {
    await db.user.update({
      where: { id: payout.userId },
      data: { earningsCoins: { increment: payout.coins } },
    });
  }

  const updated = await db.payoutRequest.update({
    where: { id },
    data: { status, adminNote: adminNote ?? null },
    include: {
      user: { select: { id: true, username: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}
