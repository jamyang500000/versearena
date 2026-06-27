import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Trophy, Play, Settings, Lock } from "lucide-react";
import FollowButton from "@/components/profile/FollowButton";
import ProfileMenu from "@/components/profile/ProfileMenu";
import { formatNumber } from "@/lib/utils";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const session = await auth();

  const user = await db.user.findUnique({
    where: { username },
    include: {
      posts: {
        orderBy: { createdAt: "desc" },
        select: { id: true, thumbnailUrl: true, videoUrl: true, _count: { select: { likes: true } } },
      },
      _count: {
        select: { followers: true, following: true, posts: true },
      },
    },
  });

  if (!user) notFound();

  const isOwnProfile = session?.user?.id === user.id;

  const isFollowing = session?.user?.id
    ? !!(await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: user.id,
          },
        },
      }))
    : false;

  // Private profile: non-followers (and unauthenticated) can't see posts
  const isPrivate = user.privateProfile && !isOwnProfile && !isFollowing;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-white flex items-center gap-2">
          @{user.username}
          {user.privateProfile && <Lock size={13} className="text-zinc-500" />}
        </h1>
        {isOwnProfile ? (
          <Link href="/settings" className="text-zinc-400 hover:text-white transition">
            <Settings size={20} />
          </Link>
        ) : session?.user?.id && (
          <ProfileMenu userId={user.id} />
        )}
      </header>

      <div className="p-4">
        {/* Avatar + Stats */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.username}
                width={80}
                height={80}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white">
                {(user.name ?? user.username)[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{user.name ?? user.username}</h2>
            {user.bio && <p className="text-zinc-400 text-sm mt-1">{user.bio}</p>}

            <div className="flex gap-4 mt-3">
              <div className="text-center">
                <p className="font-bold text-white">{isPrivate ? "—" : formatNumber(user._count.posts)}</p>
                <p className="text-zinc-500 text-xs">Posts</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-white">{formatNumber(user._count.followers)}</p>
                <p className="text-zinc-500 text-xs">Followers</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-white">{formatNumber(user._count.following)}</p>
                <p className="text-zinc-500 text-xs">Following</p>
              </div>
            </div>
          </div>
        </div>

        {/* Battle record — hidden on private profiles */}
        {!isPrivate && (
          <div className="bg-zinc-900 rounded-2xl p-3 flex items-center gap-3 mb-4">
            <Trophy size={18} className="text-yellow-400" />
            <span className="text-sm text-zinc-300">
              Battle Record:{" "}
              <span className="text-green-400 font-bold">{user.wins}W</span>
              {" / "}
              <span className="text-red-400 font-bold">{user.losses}L</span>
            </span>
          </div>
        )}

        {/* Action buttons */}
        {!isOwnProfile ? (
          <FollowButton userId={user.id} initialFollowing={isFollowing} />
        ) : (
          <Link
            href="/settings"
            className="block w-full py-2.5 rounded-xl border border-zinc-700 text-white text-sm font-semibold text-center hover:bg-zinc-800 transition"
          >
            Edit Profile
          </Link>
        )}
      </div>

      {/* Posts grid or private lock */}
      {isPrivate ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
            <Lock size={24} className="text-zinc-500" />
          </div>
          <p className="text-white font-bold text-lg">This account is private</p>
          <p className="text-zinc-500 text-sm mt-1">Follow to see their posts and battles</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {user.posts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`} className="relative aspect-square bg-zinc-900 group">
              {post.thumbnailUrl ? (
                <Image
                  src={post.thumbnailUrl}
                  alt="Post"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play size={20} className="text-zinc-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  ❤️ {formatNumber(post._count.likes)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
