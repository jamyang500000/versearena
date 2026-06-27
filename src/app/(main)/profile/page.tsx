import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function ProfileRedirectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  if (!user) redirect("/login");
  redirect(`/profile/${user.username}`);
}
