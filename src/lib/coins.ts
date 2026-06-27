import { db } from "./db";

export const GIFT_CATALOG = [
  { type: "FIRE",    emoji: "🔥", label: "Fire",    cost: 10,   color: "#FF4500" },
  { type: "MIC",     emoji: "🎤", label: "Mic",     cost: 50,   color: "#FFD700" },
  { type: "CROWN",   emoji: "👑", label: "Crown",   cost: 100,  color: "#FFD700" },
  { type: "DIAMOND", emoji: "💎", label: "Diamond", cost: 500,  color: "#B9F2FF" },
  { type: "TROPHY",  emoji: "🏆", label: "Trophy",  cost: 1000, color: "#FFD700" },
] as const;

export type GiftTypeName = (typeof GIFT_CATALOG)[number]["type"];

export async function spendCoins(
  userId: string,
  amount: number,
  type: string,
  note?: string
): Promise<{ success: boolean; balance: number }> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { coins: true } });
  if (!user || user.coins < amount) return { success: false, balance: user?.coins ?? 0 };

  const updated = await db.user.update({
    where: { id: userId },
    data: { coins: { decrement: amount } },
    select: { coins: true },
  });

  await db.coinTransaction.create({
    data: { userId, amount: -amount, type: "SPENT_GIFT", note },
  });

  return { success: true, balance: updated.coins };
}

export async function earnCoins(
  userId: string,
  amount: number,
  type: string,
  note?: string
): Promise<number> {
  const updated = await db.user.update({
    where: { id: userId },
    data: { coins: { increment: amount } },
    select: { coins: true },
  });

  await db.coinTransaction.create({
    data: { userId, amount, type: type as never, note },
  });

  return updated.coins;
}
