// Drizzle schema. The auth tables (user/session/account/verification) match
// Better Auth's expected shape (camelCase JS keys → snake_case columns), with
// the `role`/`banned`/`impersonatedBy` fields the admin plugin adds. Content,
// per-user, and analytics tables follow.
import {
  pgTable, text, boolean, integer, doublePrecision, timestamp, jsonb,
  serial, bigserial, uuid, date, numeric, index, primaryKey,
} from "drizzle-orm/pg-core";

// ---- Better Auth core (+ admin plugin fields) ----
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---- Content (mirrors the frontend document contract in docs/PHASE2.md) ----
export const habitats = pgTable("habitats", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  color: text("color").notNull(),
  rgb: text("rgb").notNull(),
  atmos: text("atmos"),
  sortOrder: integer("sort_order").default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const threatClasses = pgTable("threat_classes", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const species = pgTable("species", {
  id: text("id").primaryKey(), // slug, used in /atlas#<id>
  name: text("name").notNull(),
  scientific: text("scientific"),
  status: text("status"),
  habitat: text("habitat").notNull().references(() => habitats.id),
  habitatLabel: text("habitat_label"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  yearExtinct: integer("year_extinct"), // null = extant; negative = BCE
  population: text("population"),
  threats: jsonb("threats").$type<string[]>().default([]),
  iconicAction: text("iconic_action"),
  description: text("description"),
  imageUrl: text("image_url"),
  imageRemote: text("image_remote"),
  youtube: text("youtube"),
  threatClass: text("threat_class").references(() => threatClasses.id),
  popCount: integer("pop_count"),
  help: jsonb("help").$type<string[]>(),
  audioUrl: text("audio_url"),
  sortOrder: integer("sort_order").default(0),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Immutable, versioned snapshots of the assembled public document. GET
// /api/species serves the latest; drafts never leak because only publish()
// writes here after server-side validation.
export const atlasSnapshots = pgTable("atlas_snapshots", {
  id: serial("id").primaryKey(),
  version: integer("version").notNull(),
  doc: jsonb("doc").notNull(),
  publishedBy: text("published_by").references(() => user.id),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
});

export const media = pgTable("media", {
  id: text("id").primaryKey(), // nanoid; also the stored filename stem
  kind: text("kind").notNull(), // 'image' | 'audio'
  originalName: text("original_name"),
  mime: text("mime").notNull(),
  sizeBytes: integer("size_bytes"),
  url: text("url").notNull(),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---- Per-user synced state ----
export const userState = pgTable("user_state", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  bookmarks: jsonb("bookmarks").$type<string[]>().default([]),
  birthYear: integer("birth_year"),
  config: jsonb("config"),
  soundOn: boolean("sound_on"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const quizScores = pgTable("quiz_scores", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  total: integer("total").notNull(),
  rounds: jsonb("rounds"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---- Analytics ----
export const events = pgTable("events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ts: timestamp("ts").notNull().defaultNow(),
  anonId: uuid("anon_id").notNull(),
  userId: text("user_id"),
  sessionKey: text("session_key"),
  name: text("name").notNull(),
  props: jsonb("props").default({}),
}, (t) => ({
  tsIdx: index("events_ts_idx").on(t.ts),
  nameTsIdx: index("events_name_ts_idx").on(t.name, t.ts),
  anonTsIdx: index("events_anon_ts_idx").on(t.anonId, t.ts),
}));

export const dailyRollups = pgTable("daily_rollups", {
  day: date("day").notNull(),
  metric: text("metric").notNull(),
  dims: jsonb("dims").notNull().default({}),
  value: numeric("value").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.day, t.metric, t.dims] }),
}));
