import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;

const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const client = postgres(connectionString, {
  prepare: false,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});
export const db = drizzle(client, { schema });