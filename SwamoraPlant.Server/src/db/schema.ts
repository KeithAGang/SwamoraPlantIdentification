import {
  pgTable,
  text,
  timestamp,
  serial,
  integer,
  real,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Every image the user submits is stored here so we can build a proprietary
// dataset over time. The on-disk path is relative to UPLOAD_ROOT in the API.
export const plantImages = pgTable(
  "plant_images",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storedPath: text("stored_path").notNull(),
    originalName: text("original_name"),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("plant_images_user_idx").on(t.userId),
    sha256Idx: index("plant_images_sha256_idx").on(t.sha256),
  }),
);

// One row per diagnosis run. Predictions + treatment are stored as JSON so
// older rows survive future schema changes to those payload shapes.
export const diagnoses = pgTable(
  "diagnoses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    imageId: integer("image_id")
      .notNull()
      .references(() => plantImages.id, { onDelete: "cascade" }),
    plant: text("plant").notNull(),
    topLabel: text("top_label").notNull(),
    topConfidence: real("top_confidence").notNull(),
    predictions: jsonb("predictions").notNull(),
    treatment: jsonb("treatment").notNull(),
    diseaseInfo: jsonb("disease_info"),
    shops: jsonb("shops"),
    lat: real("lat"),
    lng: real("lng"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("diagnoses_user_idx").on(t.userId),
    createdIdx: index("diagnoses_created_idx").on(t.createdAt),
  }),
);

// One row per chat message. Conversations are grouped by `conversationId`.
// We also remember which diagnosis the conversation is anchored to (if any) so
// answers can be re-grounded later. Content is plain text — for tool-calling
// payloads we serialize them into `meta`.
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").notNull(),
    diagnosisId: integer("diagnosis_id").references(() => diagnoses.id, {
      onDelete: "set null",
    }),
    role: text("role").notNull(), // 'system' | 'user' | 'assistant'
    content: text("content").notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("chat_messages_user_idx").on(t.userId),
    convIdx: index("chat_messages_conversation_idx").on(t.conversationId),
    createdIdx: index("chat_messages_created_idx").on(t.createdAt),
  }),
);

// User favourite shops — persisted "saved shops" data point.
// Shop identity is the Google place_id when available, falling back to a
// composite "name|address" key.
export const favoriteShops = pgTable(
  "favorite_shops",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shopKey: text("shop_key").notNull(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    rating: real("rating"),
    mapsUrl: text("maps_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("favorite_shops_user_idx").on(t.userId),
    uniqueIdx: index("favorite_shops_user_shop_idx").on(t.userId, t.shopKey),
  }),
);

// Crowdsourced shop submissions awaiting moderation. Lightweight schema —
// we'll surface these on the admin side once volume grows.
export const shopSubmissions = pgTable(
  "shop_submissions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address").notNull(),
    city: text("city"),
    phone: text("phone"),
    notes: text("notes"),
    lat: real("lat"),
    lng: real("lng"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("shop_submissions_user_idx").on(t.userId),
    statusIdx: index("shop_submissions_status_idx").on(t.status),
  }),
);

