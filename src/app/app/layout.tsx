import { requireUser } from "@/lib/auth/dal";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="min-h-screen w-full pb-24 md:pb-10 md:pl-24">
      {/* Single content column shared by every app page */}
      <div className="mx-auto min-h-screen w-full max-w-3xl sm:px-6 lg:px-10">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
