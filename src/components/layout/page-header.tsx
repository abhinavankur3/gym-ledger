import Link from "next/link";
import { ChevronLeft, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** One line under the title; keep it useful (a count, a date), not a tagline. */
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  /** Right-hand control. When omitted, a profile button (to More) is shown on mobile. */
  action?: React.ReactNode;
  /** Hide the mobile profile button (on More itself, or screens with a back link). */
  hideProfile?: boolean;
  className?: string;
};

/** Standard screen header: optional back link, display title, one-line subtitle, one action. */
export function PageHeader({ title, subtitle, back, action, hideProfile, className }: Props) {
  return (
    <header className={cn("pt-6 pb-5 md:pt-10", className)}>
      {back && (
        <Link href={back.href} className="-ml-2 mb-2 inline-flex h-10 items-center gap-0.5 rounded-xl pr-3 pl-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" /> {back.label}
        </Link>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[2rem] md:text-[2.5rem]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action ?? (hideProfile ? null : <ProfileButton />)}
      </div>
    </header>
  );
}

/** Mobile entry point to More (profile, settings, library). The desktop rail links it directly. */
export function ProfileButton({ initial }: { initial?: string }) {
  return (
    <Link href="/app/more" aria-label="Profile and more" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-base font-bold shadow-soft md:hidden">
      {initial ?? <UserRound className="h-5 w-5" />}
    </Link>
  );
}
