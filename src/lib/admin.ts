import { auth } from "@/lib/auth";

// Returns true if the current session user is an admin
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.email) return false;
  const adminEmail = process.env.ADMIN_EMAIL ?? "";
  return session.user.email === adminEmail;
}
