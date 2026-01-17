import { eq, and, desc } from "drizzle-orm";
import { db } from "../config/database.js";
import {
  products,
  deals,
  users,
  userDealPreferences,
  notificationLog,
} from "./schema.js";

// ============================================
// User CRUD Operations
// ============================================

export async function createUser(data: {
  telegramId: number;
  username?: string;
  firstName?: string;
  storeId?: number;
}) {
  const [user] = await db
    .insert(users)
    .values({
      telegramId: data.telegramId,
      username: data.username,
      firstName: data.firstName,
      storeId: data.storeId ?? 25,
    })
    .returning();
  return user;
}

export async function getUserByTelegramId(telegramId: number) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId));
  return user;
}

export async function updateUserStoreId(telegramId: number, storeId: number) {
  const [user] = await db
    .update(users)
    .set({ storeId, lastActiveAt: new Date() })
    .where(eq(users.telegramId, telegramId))
    .returning();
  return user;
}

export async function updateUserNotifications(
  telegramId: number,
  enabled: boolean
) {
  const [user] = await db
    .update(users)
    .set({ notificationsEnabled: enabled, lastActiveAt: new Date() })
    .where(eq(users.telegramId, telegramId))
    .returning();
  return user;
}

export async function updateUserLastActive(telegramId: number) {
  const [user] = await db
    .update(users)
    .set({ lastActiveAt: new Date() })
    .where(eq(users.telegramId, telegramId))
    .returning();
  return user;
}

export async function getAllActiveUsers() {
  return db.select().from(users).where(eq(users.notificationsEnabled, true));
}

export async function getUsersByStoreId(storeId: number) {
  return db.select().from(users).where(eq(users.storeId, storeId));
}

// ============================================
// Product CRUD Operations
// ============================================

export async function createProduct(data: {
  itmUpcCode: string;
  brand: string;
  name?: string;
  spec?: string;
  goodsType?: number;
  goodsSecondType?: number;
  goodsImg?: string;
}) {
  const [product] = await db.insert(products).values(data).returning();
  return product;
}

export async function getProductByUpc(upc: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.itmUpcCode, upc));
  return product;
}

export async function updateProduct(
  upc: string,
  data: {
    brand?: string;
    name?: string;
    spec?: string;
    goodsImg?: string;
    frequency?: number;
  }
) {
  const [product] = await db
    .update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.itmUpcCode, upc))
    .returning();
  return product;
}

export async function incrementProductFrequency(upc: string) {
  const product = await getProductByUpc(upc);
  if (!product) return null;

  const [updated] = await db
    .update(products)
    .set({ frequency: (product.frequency ?? 0) + 1, updatedAt: new Date() })
    .where(eq(products.itmUpcCode, upc))
    .returning();
  return updated;
}

// ============================================
// Deal CRUD Operations
// ============================================

export async function createDeal(data: {
  dealId: number;
  productId: number;
  currentPrice?: string;
  sourcePrice?: string;
  discountPrice?: string;
  discountType?: number;
  startTime?: Date;
  endTime?: Date;
  isLatest?: boolean;
  likesCount?: number;
  forwardsCount?: number;
  commentsCount?: number;
  rawData?: unknown;
}) {
  const [deal] = await db.insert(deals).values(data).returning();
  return deal;
}

export async function getDealByDealId(dealId: number) {
  const [deal] = await db.select().from(deals).where(eq(deals.dealId, dealId));
  return deal;
}

export async function updateDeal(
  dealId: number,
  data: {
    currentPrice?: string;
    sourcePrice?: string;
    discountPrice?: string;
    discountType?: number;
    startTime?: Date;
    endTime?: Date;
    isActive?: boolean;
    isLatest?: boolean;
    likesCount?: number;
    forwardsCount?: number;
    commentsCount?: number;
    rawData?: unknown;
  }
) {
  const [deal] = await db
    .update(deals)
    .set({ ...data, lastUpdatedAt: new Date() })
    .where(eq(deals.dealId, dealId))
    .returning();
  return deal;
}

export async function getActiveDeals() {
  return db.select().from(deals).where(eq(deals.isActive, true));
}

export async function getLatestDeals() {
  return db
    .select()
    .from(deals)
    .where(and(eq(deals.isActive, true), eq(deals.isLatest, true)))
    .orderBy(desc(deals.firstSeenAt));
}

export async function getDealWithProduct(dealId: number) {
  const result = await db
    .select()
    .from(deals)
    .leftJoin(products, eq(deals.productId, products.id))
    .where(eq(deals.id, dealId));

  return result[0];
}

export async function markDealsAsInactive(dealIds: number[]) {
  if (dealIds.length === 0) return [];

  return db
    .update(deals)
    .set({ isActive: false, lastUpdatedAt: new Date() })
    .where(eq(deals.dealId, dealIds[0]))
    .returning();
}

// ============================================
// User Deal Preferences Operations
// ============================================

export async function setDealFavorite(
  userTelegramId: number,
  dealId: number,
  isFavorite: boolean
) {
  const [pref] = await db
    .insert(userDealPreferences)
    .values({
      userTelegramId,
      dealId,
      isFavorite,
    })
    .onConflictDoUpdate({
      target: [userDealPreferences.userTelegramId, userDealPreferences.dealId],
      set: { isFavorite, updatedAt: new Date() },
    })
    .returning();
  return pref;
}

export async function setDealHidden(
  userTelegramId: number,
  dealId: number,
  isHidden: boolean
) {
  const [pref] = await db
    .insert(userDealPreferences)
    .values({
      userTelegramId,
      dealId,
      isHidden,
    })
    .onConflictDoUpdate({
      target: [userDealPreferences.userTelegramId, userDealPreferences.dealId],
      set: { isHidden, updatedAt: new Date() },
    })
    .returning();
  return pref;
}

export async function getUserFavoriteDeals(userTelegramId: number) {
  return db
    .select()
    .from(userDealPreferences)
    .leftJoin(deals, eq(userDealPreferences.dealId, deals.id))
    .where(
      and(
        eq(userDealPreferences.userTelegramId, userTelegramId),
        eq(userDealPreferences.isFavorite, true)
      )
    );
}

export async function getUserHiddenDeals(userTelegramId: number) {
  return db
    .select()
    .from(userDealPreferences)
    .where(
      and(
        eq(userDealPreferences.userTelegramId, userTelegramId),
        eq(userDealPreferences.isHidden, true)
      )
    );
}

export async function isDealHiddenForUser(
  userTelegramId: number,
  dealId: number
) {
  const [pref] = await db
    .select()
    .from(userDealPreferences)
    .where(
      and(
        eq(userDealPreferences.userTelegramId, userTelegramId),
        eq(userDealPreferences.dealId, dealId),
        eq(userDealPreferences.isHidden, true)
      )
    );
  return !!pref;
}

// ============================================
// Notification Log Operations
// ============================================

export async function logNotification(data: {
  userTelegramId: number;
  dealId: number;
  wasSuccessful: boolean;
}) {
  const [log] = await db.insert(notificationLog).values(data).returning();
  return log;
}

export async function getNotificationsByUser(userTelegramId: number) {
  return db
    .select()
    .from(notificationLog)
    .where(eq(notificationLog.userTelegramId, userTelegramId))
    .orderBy(desc(notificationLog.sentAt));
}
