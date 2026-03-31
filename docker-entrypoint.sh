#!/bin/sh
set -e

# Run database migrations
echo "Running database migrations..."
node node_modules/drizzle-kit/bin.cjs migrate

# Run seed (creates admin user + exercises if not exist)
echo "Running database seed..."
node src/lib/db/seed.mjs

# Start the application
echo "Starting Gym Ledger..."
exec node server.js
