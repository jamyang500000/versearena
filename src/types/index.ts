export type UserProfile = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  image: string | null;
  bio: string | null;
  wins: number;
  losses: number;
  createdAt: Date;
  _count?: {
    followers: number;
    following: number;
    posts: number;
  };
};

export type PostWithUser = {
  id: string;
  userId: string;
  caption: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  views: number;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  _count: {
    likes: number;
    comments: number;
  };
  isLiked?: boolean;
};

export type BattleWithUsers = {
  id: string;
  title: string | null;
  status: "PENDING" | "WAITING" | "LIVE" | "VOTING" | "ENDED";
  roomCode: string;
  challengerId: string;
  opponentId: string | null;
  winnerId: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  challenger: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  opponent: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  } | null;
  _count: {
    votes: number;
  };
};

export type CommentWithUser = {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
};
