import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Image from "next/image";
import SubscribeButton from "@/components/SubscribeButton";

const TIERS = [
  {
    tier: "SUPPORTER",
    label: "Supporter",
    emoji: "🤜",
    coinCost: 50,
    perks: ["Supporter badge on profile", "Priority in chat", "Access to exclusive posts"],
  },
  {
    tier: "SUPERFAN",
    label: "SuperFan",
    emoji: "🔥",
    coinCost: 150,
    perks: ["SuperFan badge", "Custom chat color", "Monthly shoutout in stream"],
  },
  {
    tier: "RIDE_OR_DIE",
    label: "Ride or Die",
    emoji: "👑",
    coinCost: 500,
    perks: ["👑 Crown badge", "Direct DMs", "Early battle access", "Split of tip revenue"],
  },
] as const;

interface PageProps { params: Promise<{ username: string }> }

export default async function SubscribePage({ params }: PageProps) {
  const { username } = await params;
  const session = await auth();

  const creator = await db.user.findUnique({
    where: { username },
    select: {
      id: true, name: true, username: true, image: true, bio: true, wins: true,
      _count: { select: { creatorSubscriptions: true, followers: true } },
    },
  });

  if (!creator) notFound();

  const mySub = session?.user?.id
    ? await db.fanSubscription.findUnique({
        where: { fanId_creatorId: { fanId: session.user.id, creatorId: creator.id } },
      })
    : null;

  const myCoins = session?.user?.id
    ? (await db.user.findUnique({ where: { id: session.user.id }, select: { coins: true } }))?.coins ?? 0
    : 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Creator card */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
          {creator.image ? (
            <Image src={creator.image} alt={creator.username} width={64} height={64} className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white">
              {(creator.name ?? creator.username)[0].toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-xl font-black text-white">{creator.name ?? creator.username}</h1>
          <p className="text-zinc-500 text-sm">
            {creator._count.creatorSubscriptions} subscribers · {creator.wins} wins
          </p>
          {creator.bio && <p className="text-zinc-400 text-sm mt-1">{creator.bio}</p>}
        </div>
      </div>

      {mySub && (
        <div className="mb-6 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 text-center">
          <p className="text-yellow-400 font-bold">
            {TIERS.find((t) => t.tier === mySub.tier)?.emoji} You&apos;re subscribed as a{" "}
            {TIERS.find((t) => t.tier === mySub.tier)?.label}!
          </p>
        </div>
      )}

      <h2 className="text-white font-bold mb-4">Choose your tier</h2>
      <div className="space-y-3">
        {TIERS.map((tier) => (
          <div
            key={tier.tier}
            className={`bg-zinc-900 border rounded-2xl p-4 ${
              mySub?.tier === tier.tier ? "border-yellow-400" : "border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-white">
                  {tier.emoji} {tier.label}
                </p>
                <p className="text-yellow-400 text-sm font-bold">{tier.coinCost} coins/month</p>
              </div>
              {session?.user?.id && session.user.id !== creator.id && (
                <SubscribeButton
                  creatorId={creator.id}
                  tier={tier.tier}
                  coinCost={tier.coinCost}
                  isCurrentTier={mySub?.tier === tier.tier}
                  isSubscribed={!!mySub}
                  myCoins={myCoins}
                />
              )}
            </div>
            <ul className="space-y-1">
              {tier.perks.map((p) => (
                <li key={p} className="text-zinc-400 text-xs flex items-center gap-1.5">
                  <span className="text-green-400">✓</span> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
