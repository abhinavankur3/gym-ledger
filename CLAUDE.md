# Gym Ledger

Self-hostable gym tracking web app — attendance, workouts, body metrics, charts.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, `output: standalone`)
- **Tailwind v4** + **shadcn/ui** (base-ui primitives, not Radix)
- **SQLite** via Drizzle ORM (`@libsql/client`)
- **Plus Jakarta Sans** font (`@fontsource-variable/plus-jakarta-sans`)
- **Recharts** for charts, **Framer Motion** for animations
- **Docker** single-container deployment

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed admin user + 80 exercises
```

## Architecture

- `/src/app/login` and `/src/app/change-password` — public auth pages
- `/src/app/admin/*` — admin panel (user management), requires admin role
- `/src/app/app/*` — main app (dashboard, attendance, workouts, exercises, metrics, charts, settings)
- `/src/lib/auth/` — JWT sessions (jose), bcrypt passwords, DAL helpers
- `/src/lib/db/` — Drizzle schema, seed script
- `/src/middleware.ts` — route protection
- Server actions only, no REST API

## Design System

**Soft & Premium** — warm amber/gold accent on dark charcoal. No gradients.

- Primary accent: `oklch(0.78 0.12 75)` (warm amber)
- Surface cards: `surface` CSS class (subtle bg + border)
- Buttons: `bg-primary text-primary-foreground` — never use ShimmerButton
- Font: Plus Jakarta Sans Variable
- Max width 430px on desktop (mobile-frame)

## Auth Model

- Admin credentials via `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- Only admins can create users
- New users must change password on first login (`forcePasswordChange` flag)

## shadcn/ui Notes

This uses **shadcn v4 with base-ui** (not Radix). Key differences:
- No `asChild` prop — use `render` prop instead (e.g., `<DialogTrigger render={<Button />}>`)
- `Select.onValueChange` passes `string | null` — guard with `if (!v) return`
- Components are in `@base-ui/react/*`

@AGENTS.md
