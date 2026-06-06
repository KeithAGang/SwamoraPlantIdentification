#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi
# Print URL with password masked
echo ">>> DATABASE_URL: $(echo "$DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/*****:*****@/')"

echo ">>> Pushing schema to database..."
# --force applies changes non-interactively. Without it, drizzle-kit prompts
# for confirmation on new tables and silently skips them in a no-TTY container.
npx drizzle-kit push --force

echo ">>> Seeding default account..."
node dist/db/seed.js

echo ">>> Starting server..."
exec node dist/index.js
