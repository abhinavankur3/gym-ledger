import { requireAdmin } from "@/lib/auth/dal";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminMobileNav } from "@/components/layout/admin-mobile-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminMobileNav />
      <AdminSidebar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-3 pb-10 sm:px-6 md:pt-10">{children}</main>
    </div>
  );
}
