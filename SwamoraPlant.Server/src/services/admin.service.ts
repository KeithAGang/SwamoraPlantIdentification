/**
 * Admin queries — aggregations and listings across all users. Every function
 * in here assumes the caller has already been validated as an admin upstream
 * (via the `requireAdmin` middleware).
 */

import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  chatMessages,
  diagnoses,
  farms,
  farmWidgets,
  favoriteShops,
  plantImages,
  shopSubmissions,
  users,
} from '../db/schema.js';

export const listAllUsers = async () => {
  // Pull per-user farm + diagnosis counts in a single round-trip using SQL
  // sub-selects so the admin table renders without N+1 queries.
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      farmCount: sql<number>`(SELECT COUNT(*) FROM ${farms} WHERE ${farms.userId} = ${users.id})`,
      diagnosisCount: sql<number>`(SELECT COUNT(*) FROM ${diagnoses} WHERE ${diagnoses.userId} = ${users.id})`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
  return rows.map((r) => ({
    ...r,
    farmCount: Number(r.farmCount ?? 0),
    diagnosisCount: Number(r.diagnosisCount ?? 0),
    createdAt: r.createdAt.toISOString(),
  }));
};

export const setUserAdmin = async (userId: number, isAdmin: boolean) => {
  const rows = await db
    .update(users)
    .set({ isAdmin })
    .where(eq(users.id, userId))
    .returning({ id: users.id, isAdmin: users.isAdmin });
  return rows[0] ?? null;
};

export const deleteUser = async (userId: number) => {
  const rows = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return rows[0] ?? null;
};

export const listAllFarms = async () => {
  const rows = await db
    .select({
      id: farms.id,
      name: farms.name,
      cropType: farms.cropType,
      location: farms.location,
      createdAt: farms.createdAt,
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email,
      widgetCount: sql<number>`(SELECT COUNT(*) FROM ${farmWidgets} WHERE ${farmWidgets.farmId} = ${farms.id})`,
    })
    .from(farms)
    .innerJoin(users, eq(farms.userId, users.id))
    .orderBy(desc(farms.createdAt));
  return rows.map((r) => ({
    ...r,
    widgetCount: Number(r.widgetCount ?? 0),
    createdAt: r.createdAt.toISOString(),
  }));
};

export const listRecentDiagnoses = async (limit = 25) => {
  const rows = await db
    .select({
      id: diagnoses.id,
      plant: diagnoses.plant,
      topLabel: diagnoses.topLabel,
      topConfidence: diagnoses.topConfidence,
      createdAt: diagnoses.createdAt,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
    })
    .from(diagnoses)
    .innerJoin(users, eq(diagnoses.userId, users.id))
    .orderBy(desc(diagnoses.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
};

export const getSiteStats = async () => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    [userCount],
    [adminCount],
    [farmCount],
    [widgetCount],
    [diagnosisCount],
    [chatCount],
    [imageCount],
    [favoriteCount],
    [submissionCount],
    [recentDiagnosesDay],
    [recentDiagnosesWeek],
    [recentUsersWeek],
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(users).where(eq(users.isAdmin, true)),
    db.select({ value: count() }).from(farms),
    db.select({ value: count() }).from(farmWidgets),
    db.select({ value: count() }).from(diagnoses),
    db.select({ value: count() }).from(chatMessages),
    db.select({ value: count() }).from(plantImages),
    db.select({ value: count() }).from(favoriteShops),
    db.select({ value: count() }).from(shopSubmissions),
    db
      .select({ value: count() })
      .from(diagnoses)
      .where(gte(diagnoses.createdAt, dayAgo)),
    db
      .select({ value: count() })
      .from(diagnoses)
      .where(gte(diagnoses.createdAt, weekAgo)),
    db
      .select({ value: count() })
      .from(users)
      .where(gte(users.createdAt, weekAgo)),
  ]);

  // Breakdown of diagnoses by plant type — feeds the donut/list on the
  // admin dashboard.
  const plantBreakdown = await db
    .select({
      plant: diagnoses.plant,
      value: count(),
    })
    .from(diagnoses)
    .groupBy(diagnoses.plant)
    .orderBy(desc(count()));

  // Submissions awaiting moderation.
  const pendingSubmissions = await db
    .select({ value: count() })
    .from(shopSubmissions)
    .where(eq(shopSubmissions.status, 'pending'));

  // Daily diagnosis counts for the past 14 days for a sparkline / trend.
  const trendRows = await db
    .select({
      day: sql<string>`to_char(${diagnoses.createdAt}::date, 'YYYY-MM-DD')`,
      value: count(),
    })
    .from(diagnoses)
    .where(gte(diagnoses.createdAt, new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)))
    .groupBy(sql`${diagnoses.createdAt}::date`)
    .orderBy(sql`${diagnoses.createdAt}::date`);

  return {
    totals: {
      users: Number(userCount?.value ?? 0),
      admins: Number(adminCount?.value ?? 0),
      farms: Number(farmCount?.value ?? 0),
      widgets: Number(widgetCount?.value ?? 0),
      diagnoses: Number(diagnosisCount?.value ?? 0),
      chatMessages: Number(chatCount?.value ?? 0),
      images: Number(imageCount?.value ?? 0),
      favorites: Number(favoriteCount?.value ?? 0),
      shopSubmissions: Number(submissionCount?.value ?? 0),
      pendingSubmissions: Number(pendingSubmissions[0]?.value ?? 0),
    },
    recent: {
      diagnoses24h: Number(recentDiagnosesDay?.value ?? 0),
      diagnoses7d: Number(recentDiagnosesWeek?.value ?? 0),
      newUsers7d: Number(recentUsersWeek?.value ?? 0),
    },
    plantBreakdown: plantBreakdown.map((p) => ({
      plant: p.plant,
      value: Number(p.value ?? 0),
    })),
    trend: trendRows.map((r) => ({ day: r.day, value: Number(r.value ?? 0) })),
  };
};

// Suppress lint: `and` import is part of the public surface even if not used
// directly here yet; remove if not needed.
void and;
