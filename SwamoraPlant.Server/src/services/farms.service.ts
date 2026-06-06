import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { farms, farmWidgets } from '../db/schema.js';

export type FarmInsert = {
  userId: number;
  name: string;
  cropType?: string | null;
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  coverImage?: string | null;
};

export type FarmPatch = Partial<Omit<FarmInsert, 'userId'>>;

export type WidgetInsert = {
  userId: number;
  farmId: number;
  type: string;
  title?: string | null;
  size?: string;
  position?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: Record<string, any>;
  dataSource?: string;
};

export type WidgetPatch = Partial<Omit<WidgetInsert, 'userId' | 'farmId'>>;

export const listFarms = async (userId: number) =>
  db
    .select()
    .from(farms)
    .where(eq(farms.userId, userId))
    .orderBy(asc(farms.createdAt));

export const getFarm = async (userId: number, farmId: number) => {
  const rows = await db
    .select()
    .from(farms)
    .where(and(eq(farms.id, farmId), eq(farms.userId, userId)));
  return rows[0] ?? null;
};

export const createFarm = async (data: FarmInsert) => {
  const rows = await db
    .insert(farms)
    .values({
      userId: data.userId,
      name: data.name,
      cropType: data.cropType ?? null,
      location: data.location ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      coverImage: data.coverImage ?? null,
    })
    .returning();
  return rows[0];
};

export const updateFarm = async (
  userId: number,
  farmId: number,
  patch: FarmPatch,
) => {
  const rows = await db
    .update(farms)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(farms.id, farmId), eq(farms.userId, userId)))
    .returning();
  return rows[0] ?? null;
};

export const deleteFarm = async (userId: number, farmId: number) => {
  const rows = await db
    .delete(farms)
    .where(and(eq(farms.id, farmId), eq(farms.userId, userId)))
    .returning({ id: farms.id });
  return rows[0] ?? null;
};

export const listWidgets = async (userId: number, farmId: number) =>
  db
    .select()
    .from(farmWidgets)
    .where(
      and(eq(farmWidgets.farmId, farmId), eq(farmWidgets.userId, userId)),
    )
    .orderBy(asc(farmWidgets.position), asc(farmWidgets.id));

export const createWidget = async (data: WidgetInsert) => {
  const rows = await db
    .insert(farmWidgets)
    .values({
      userId: data.userId,
      farmId: data.farmId,
      type: data.type,
      title: data.title ?? null,
      size: data.size ?? 'md',
      position: data.position ?? 0,
      config: data.config ?? {},
      dataSource: data.dataSource ?? 'mock',
    })
    .returning();
  return rows[0];
};

export const updateWidget = async (
  userId: number,
  widgetId: number,
  patch: WidgetPatch,
) => {
  const rows = await db
    .update(farmWidgets)
    .set(patch)
    .where(and(eq(farmWidgets.id, widgetId), eq(farmWidgets.userId, userId)))
    .returning();
  return rows[0] ?? null;
};

export const deleteWidget = async (userId: number, widgetId: number) => {
  const rows = await db
    .delete(farmWidgets)
    .where(and(eq(farmWidgets.id, widgetId), eq(farmWidgets.userId, userId)))
    .returning({ id: farmWidgets.id });
  return rows[0] ?? null;
};

export const reorderWidgets = async (
  userId: number,
  farmId: number,
  orderedIds: number[],
) => {
  const updated: Array<{ id: number; position: number }> = [];
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const rows = await db
      .update(farmWidgets)
      .set({ position: i })
      .where(
        and(
          eq(farmWidgets.id, id),
          eq(farmWidgets.userId, userId),
          eq(farmWidgets.farmId, farmId),
        ),
      )
      .returning({ id: farmWidgets.id, position: farmWidgets.position });
    if (rows[0]) updated.push(rows[0]);
  }
  return updated;
};
