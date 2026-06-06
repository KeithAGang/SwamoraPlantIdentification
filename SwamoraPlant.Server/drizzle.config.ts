import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.DATABASE_URL!;
const parsed = new URL(rawUrl);
const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
console.log(`[drizzle] host=${parsed.hostname} port=${parsed.port || 5432} db=${parsed.pathname.slice(1)} ssl=${!isLocal}`);

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    ssl: isLocal ? false : { rejectUnauthorized: false },
  },
  verbose: true,
});
