#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi
echo ">>> DATABASE_URL: $(echo "$DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/*****:*****@/')"

echo ">>> Testing DB connection..."
node -e "
const postgres = require('postgres');
const url = process.env.DATABASE_URL;
const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
const sql = postgres(url, { ssl: isLocal ? undefined : { rejectUnauthorized: false }, connect_timeout: 10 });
sql\`SELECT 1 AS ok\`
  .then(r => { console.log('DB connection OK'); return sql.end(); })
  .catch(e => { console.error('DB connection FAILED:', e.message); process.exit(1); });
"

echo ">>> Pushing schema to database..."
npx drizzle-kit push --force 2>&1

echo ">>> Seeding default account..."
node dist/db/seed.js

echo ">>> Starting server..."
exec node dist/index.js
