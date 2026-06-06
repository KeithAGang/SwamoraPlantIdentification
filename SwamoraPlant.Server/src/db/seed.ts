import * as dotenv from 'dotenv';
dotenv.config();

import { db } from './index.js';
import { users } from './schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../services/auth.service.js';

const SEED_EMAIL = 'swamora@img.plant';
const SEED_PASSWORD = 'abcd1234';
const SEED_NAME = 'Swamora';

const existing = await db.select().from(users).where(eq(users.email, SEED_EMAIL));

if (existing.length === 0) {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  await db.insert(users).values({
    name: SEED_NAME,
    email: SEED_EMAIL,
    passwordHash,
    isAdmin: true,
  });
  console.log(`Seeded default admin user: ${SEED_EMAIL}`);
} else if (!existing[0].isAdmin) {
  // Make sure the seeded account is always elevated to admin even if the row
  // already existed from an earlier seed.
  await db.update(users).set({ isAdmin: true }).where(eq(users.email, SEED_EMAIL));
  console.log(`Promoted existing user to admin: ${SEED_EMAIL}`);
} else {
  console.log(`Default admin user already exists: ${SEED_EMAIL}`);
}

process.exit(0);
