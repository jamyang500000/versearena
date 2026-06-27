import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";
import WelcomeModal from "@/components/onboarding/WelcomeModal";
import ProfilePrompt from "@/components/onboarding/ProfilePrompt";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-black pb-16">
      {children}
      <BottomNav />
      <WelcomeModal />
      <ProfilePrompt />
    </div>
  );
}
