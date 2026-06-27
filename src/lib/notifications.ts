import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";

interface NotificationPrefs {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  battleResults: boolean;
  gifts: boolean;
  crew: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  likes: true,
  comments: true,
  follows: true,
  battleResults: true,
  gifts: true,
  crew: true,
};

// Map notification types to pref keys
const TYPE_TO_PREF: Record<NotificationType, keyof NotificationPrefs | null> = {
  LIKE: "likes",
  COMMENT: "comments",
  FOLLOW: "follows",
  BATTLE_RESULT: "battleResults",
  GIFT_RECEIVED: "gifts",
  CREW_INVITE: "crew",
  BATTLE_REQUEST: "battleResults",
  BATTLE_INVITE: "battleResults",
  TOURNAMENT_START: "battleResults",
  SUBSCRIPTION: null, // always send
};

/**
 * Creates a notification only if the recipient has that type enabled.
 * Fire-and-forget safe — errors are swallowed.
 */
export async function createNotification({
  userId,
  fromUserId,
  type,
  message,
  link,
}: {
  userId: string;
  fromUserId?: string;
  type: NotificationType;
  message: string;
  link?: string;
}) {
  try {
    const prefKey = TYPE_TO_PREF[type];

    if (prefKey !== null) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { notificationPrefs: true },
      });

      const prefs: NotificationPrefs = {
        ...DEFAULT_PREFS,
        ...((user?.notificationPrefs as Partial<NotificationPrefs>) ?? {}),
      };

      if (!prefs[prefKey]) return; // user has this type disabled
    }

    await db.notification.create({
      data: {
        userId,
        fromUserId: fromUserId ?? null,
        type,
        message,
        link: link ?? null,
      },
    });
  } catch {
    // fire-and-forget — never throw
  }
}
