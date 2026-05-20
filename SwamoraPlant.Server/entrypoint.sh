#!/bin/sh
set -e

echo ">>> Pushing schema to database..."
# --force applies changes non-interactively. Without it, drizzle-kit prompts
# for confirmation on new tables and silently skips them in a no-TTY container.
npx drizzle-kit push --force

echo ">>> Seeding default account..."
node dist/db/seed.js

echo ">>> Starting server..."
exec node dist/index.js
