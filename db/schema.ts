import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  pictureUrl: text("picture_url"),
  createdAt: text("created_at").notNull(),
  lastLoginAt: text("last_login_at").notNull(),
});

export const tryOnLooks = sqliteTable(
  "try_on_looks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    variantName: text("variant_name").notNull().default("Original"),
    variantHex: text("variant_hex"),
    personKey: text("person_key").notNull(),
    productKey: text("product_key").notNull(),
    resultKey: text("result_key").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("try_on_looks_user_created_idx").on(table.userId, table.createdAt)],
);

export const tryOnUsage = sqliteTable(
  "try_on_usage",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    usageDay: text("usage_day").notNull(),
    generationCount: integer("generation_count").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.usageDay] }),
    index("try_on_usage_day_idx").on(table.usageDay),
  ],
);
