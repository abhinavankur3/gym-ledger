import { requireUser } from "@/lib/auth/dal";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="mx-auto w-full max-w-[430px] min-h-screen pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
