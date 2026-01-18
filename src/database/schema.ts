import {
  pgTable,
  serial,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  bigint,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Products table
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    itmUpcCode: text("itm_upc_code").notNull().unique(),
    brand: text("brand").notNull(),
    name: text("name"),
    spec: text("spec"),
    goodsType: integer("goods_type"),
    goodsSecondType: integer("goods_second_type"),
    goodsImg: text("goods_img"),
    frequency: integer("frequency").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    upcIdx: index("idx_products_upc").on(table.itmUpcCode),
    brandIdx: index("idx_products_brand").on(table.brand),
  })
);

// Deals table
export const deals = pgTable(
  "deals",
  {
    id: serial("id").primaryKey(),
    dealId: integer("deal_id").notNull().unique(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    currentPrice: decimal("current_price", { precision: 10, scale: 2 }),
    sourcePrice: decimal("source_price", { precision: 10, scale: 2 }),
    discountPrice: decimal("discount_price", { precision: 10, scale: 2 }),
    discountType: integer("discount_type"),
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    isActive: boolean("is_active").default(true),
    isLatest: boolean("is_latest").default(false),
    likesCount: integer("likes_count").default(0),
    forwardsCount: integer("forwards_count").default(0),
    commentsCount: integer("comments_count").default(0),
    rawData: jsonb("raw_data"),
    firstSeenAt: timestamp("first_seen_at").defaultNow(),
    lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  },
  (table) => ({
    productIdx: index("idx_deals_product").on(table.productId),
    activeIdx: index("idx_deals_active").on(table.isActive),
    latestIdx: index("idx_deals_latest").on(table.isLatest),
    dealIdIdx: index("idx_deals_deal_id").on(table.dealId),
  })
);

// Users table
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
    username: text("username"),
    firstName: text("first_name"),
    storeId: integer("store_id"),
    notificationsEnabled: boolean("notifications_enabled").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    lastActiveAt: timestamp("last_active_at").defaultNow(),
  },
  (table) => ({
    telegramIdIdx: index("idx_users_telegram_id").on(table.telegramId),
    storeIdIdx: index("idx_users_store_id").on(table.storeId),
  })
);

// User deal preferences table
export const userDealPreferences = pgTable(
  "user_deal_preferences",
  {
    id: serial("id").primaryKey(),
    userTelegramId: bigint("user_telegram_id", { mode: "number" }).notNull(),
    dealId: integer("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    isFavorite: boolean("is_favorite").default(false),
    isHidden: boolean("is_hidden").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueUserDeal: unique("unique_user_deal").on(
      table.userTelegramId,
      table.dealId
    ),
    userIdx: index("idx_user_prefs_user").on(table.userTelegramId),
    dealIdx: index("idx_user_prefs_deal").on(table.dealId),
    favoriteIdx: index("idx_user_prefs_favorite").on(table.isFavorite),
    hiddenIdx: index("idx_user_prefs_hidden").on(table.isHidden),
  })
);

// Notification log table
export const notificationLog = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  userTelegramId: bigint("user_telegram_id", { mode: "number" }).notNull(),
  dealId: integer("deal_id").references(() => deals.id),
  sentAt: timestamp("sent_at").defaultNow(),
  wasSuccessful: boolean("was_successful"),
});

// Relations
export const productsRelations = relations(products, ({ many }) => ({
  deals: many(deals),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  product: one(products, {
    fields: [deals.productId],
    references: [products.id],
  }),
  userPreferences: many(userDealPreferences),
  notifications: many(notificationLog),
}));

export const userDealPreferencesRelations = relations(
  userDealPreferences,
  ({ one }) => ({
    deal: one(deals, {
      fields: [userDealPreferences.dealId],
      references: [deals.id],
    }),
  })
);

export const notificationLogRelations = relations(
  notificationLog,
  ({ one }) => ({
    deal: one(deals, {
      fields: [notificationLog.dealId],
      references: [deals.id],
    }),
  })
);
