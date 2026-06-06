import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.DATABASE_URL!;
const isLocal = !rawUrl || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');
// postgres-js honours sslmode in the URL; append it for any remote DB
const url = isLocal
  ? rawUrl
  : rawUrl.includes('?')
  ? `${rawUrl}&sslmode=no-verify`
  : `${rawUrl}?sslmode=no-verify`;

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
