import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'change_this_secret');

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export const signToken = (payload: { id: number; email: string }) =>
  new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);

export const verifyToken = async (token: string) => {
  const { payload } = await jwtVerify(token, secret);
  return payload as { id: number; email: string };
};

export const findUserByEmail = async (email: string) => {
  const result = await db.select().from(users).where(eq(users.email, email));
  return result[0] ?? null;
};

export const findUserById = async (id: number) => {
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0] ?? null;
};

export const createUser = async (name: string, email: string, password: string) => {
  const passwordHash = await hashPassword(password);
  const result = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning({ id: users.id, email: users.email, name: users.name });
  return result[0];
};
