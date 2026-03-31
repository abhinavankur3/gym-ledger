# Gym Ledger

A self-hostable, mobile-first web app for tracking gym attendance, workouts, body metrics, and progress over time.

## Features

- **Gym Attendance** — Check in/out, calendar view, streak tracking
- **Training Logs** — Log exercises, sets, reps, weight, RPE. PR detection
- **Exercise Library** — 80 pre-seeded exercises, searchable/filterable, add custom exercises
- **Body Metrics** — Track weight, body fat %, measurements, custom metrics
- **Charts** — Body weight over time, training volume by muscle group, attendance heatmap, PR progression
- **Admin Panel** — Admin-only user provisioning, password resets
- **PWA** — Installable on mobile, works from home screen

## Tech Stack

- [Next.js](https://nextjs.org) (App Router, Server Actions)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [SQLite](https://sqlite.org) via [Drizzle ORM](https://orm.drizzle.team)
- [Recharts](https://recharts.org) for data visualization
- [Docker](https://docker.com) for deployment

## Quick Start

### Prerequisites

- Node.js 22+
- npm

### Setup

```bash
# Clone the repo
git clone https://github.com/abhinavankur3/gym-ledger.git
cd gym-ledger

# Install dependencies
npm install

# Create your environment file
cp .env.example .env.local

# Edit .env.local and set:
#   ADMIN_EMAIL — admin login email
#   ADMIN_PASSWORD — admin login password
#   SESSION_SECRET — random 32+ char string (run: openssl rand -base64 32)

# Run database migrations and seed
npm run db:migrate
npm run db:seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your admin credentials.

### Create Users

1. Log in as admin
2. Go to the admin panel (auto-redirects on admin login)
3. Click **Create User** and set a temporary password
4. The user will be required to change their password on first login

## Self-Hosting with Docker

```bash
# Generate a session secret
export SESSION_SECRET=$(openssl rand -base64 32)

# Start the container
docker compose up -d

# Or build and run manually
docker build -t gym-ledger .
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=file:/app/data/gym-ledger.db \
  -e ADMIN_EMAIL=admin@gym.local \
  -e ADMIN_PASSWORD=changeme \
  -e SESSION_SECRET=$SESSION_SECRET \
  -v gym-data:/app/data \
  gym-ledger
```

The app will be available at `http://localhost:3000`. Data is persisted in the `gym-data` Docker volume.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | `file:./data/gym-ledger.db` | SQLite database path |
| `ADMIN_EMAIL` | No | `admin@gym.local` | Initial admin email |
| `ADMIN_PASSWORD` | No | `changeme` | Initial admin password |
| `SESSION_SECRET` | **Yes** | — | Secret for JWT session signing |

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run db:generate  # Generate new migration after schema changes
npm run db:migrate   # Apply pending migrations
npm run db:seed      # Seed database (idempotent)
npm run db:studio    # Open Drizzle Studio (DB browser)
```

## Project Structure

```
src/
├── app/
│   ├── login/             # Login page
│   ├── change-password/   # Forced password change
│   ├── admin/             # Admin panel (user management)
│   └── app/               # Main app
│       ├── attendance/    # Check-in/out, calendar
│       ├── workouts/      # Training logs
│       ├── exercises/     # Exercise library
│       ├── metrics/       # Body metrics
│       ├── charts/        # Data visualizations
│       └── settings/      # User preferences
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Bottom nav, admin sidebar
│   └── shared/            # SW register, etc.
├── lib/
│   ├── auth/              # Session, password, DAL
│   ├── db/                # Schema, seed, migrations
│   ├── actions/           # Server actions
│   └── validators/        # Zod schemas
└── middleware.ts           # Route protection
```

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
