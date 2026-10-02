# Kochi

Kochi (コーチ, "coach") — a self-hostable AI personal coach for training and nutrition. See [Plan.md](Plan.md) for the product plan.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, `output: standalone`)
- **Tailwind v4** + **shadcn/ui** (base-ui primitives, not Radix)
- **SQLite** via Drizzle ORM (`@libsql/client`)
- **Bricolage Grotesque + Figtree** fonts (`@fontsource-variable/*`)
- **Recharts** for charts; motion is CSS-only (one load moment per screen)
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

Colour-blocked, layered, friendly — session colour heroes, navy ink, soft deep shadows. Tokens live in `src/app/globals.css`.

- **Themes:** Light (warm oat-sand `#ebe5d1`, cream cards `#fffcf5`, earthy neutrals) and Dark (deep navy `#10143a`, navy cards). Preference stored in the `theme` cookie (`src/lib/theme.ts`); "system" is resolved by an inline script in the root layout.
- **Primary:** indigo `bg-primary` buttons with `shadow-glow`. Text on bright colour blocks uses `text-ink` (navy).
- **Session tones:** `push` coral, `pull` sky, `legs` leaf green, `core`/`sun` yellow. Pick with `sessionTone()` / `muscleRegion()` from `src/lib/muscles.ts`; never hand-pick colours per screen.
- **Type:** Bricolage Grotesque for headings/numbers (`font-display`), Figtree for body. Numbers use `tabular`.
- **Elevation:** `shadow-soft` for cards, `shadow-lift` for floating chrome (nav, dialogs). Cards are `rounded-3xl`.
- **Building blocks:** `PageHeader` (screen titles + mobile profile button), `SessionHero` (tone block + watermark + `EquipmentArt`), `FactTable` (label | value rows), `MuscleChip`, `ConfirmDialog` (never `window.confirm`).
- **Avoid:** UI gradients, ShimmerButton/glass effects, all-caps tracked eyebrow labels, "A · B" mid-dot strings, arrows appended to button text, emoji icons, per-section fade-in animations, hard-coded Tailwind palette colours.
- **Layout:** the app layout supplies horizontal padding and a `max-w-2xl` column; pages don't add their own. Floating tab bar on mobile (Home, Train, Nutrition, Progress, Coach; More via the profile button), floating rail on desktop.

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
