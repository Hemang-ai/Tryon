import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
    personKey: text("person_key").notNull(),
    productKey: text("product_key").notNull(),
    resultKey: text("result_key").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("try_on_looks_user_created_idx").on(table.userId, table.createdAt)],
);
