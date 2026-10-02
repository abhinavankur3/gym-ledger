import { requireUser } from "@/lib/auth/dal";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="min-h-screen w-full pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-12 md:pl-28">
      {/* Single content column shared by every app page */}
      <div className="mx-auto min-h-screen w-full max-w-2xl px-4 sm:px-6">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
