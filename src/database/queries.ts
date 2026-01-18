import { eq, and, desc, count, or, isNull } from "drizzle-orm";
import { db } from "../config/database.js";
import { createDbQueryTracker, getAllQueryFrequencies } from "../utils/logger.js";
import {
  products,
  deals,
  users,
  userDealPreferences,
  notificationLog,
  userShoppingCart,
} from "./schema.js";

export async function logSlowQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  slowThreshold: number = 1000
): Promise<T> {
  const tracker = createDbQueryTracker(queryName, undefined, slowThreshold);

  try {
    const result = await queryFn();
    tracker.complete();
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    tracker.error(errorMessage);
    throw error;
  }
}

export function getQueryFrequencyStats(): Record<string, number> {
  return getAllQueryFrequencies();
}

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
      storeId: data.storeId,
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
  return logSlowQuery(
    'getAllActiveUsers',
    () => db.select().from(users).where(eq(users.notificationsEnabled, true))
  );
}

export async function getUsersByStoreId(storeId: number) {
  return logSlowQuery(
    'getUsersByStoreId',
    () => db.select().from(users).where(eq(users.storeId, storeId))
  );
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
  storeId: number;
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
    storeId?: number;
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
  return logSlowQuery(
    'getLatestDeals',
    () =>
      db
        .select()
        .from(deals)
        .where(and(eq(deals.isActive, true), eq(deals.isLatest, true)))
        .orderBy(desc(deals.firstSeenAt))
  );
}

export async function getDealWithProduct(dealId: number) {
  const result = await logSlowQuery(
    'getDealWithProduct',
    () =>
      db
        .select()
        .from(deals)
        .leftJoin(products, eq(deals.productId, products.id))
        .where(eq(deals.id, dealId))
  );

  return result[0];
}

export async function getActiveDealsWithProducts(limit?: number, offset?: number) {
  const result = await logSlowQuery(
    'getActiveDealsWithProducts',
    () => {
      const query = db
        .select()
        .from(deals)
        .leftJoin(products, eq(deals.productId, products.id))
        .where(eq(deals.isActive, true))
        .orderBy(desc(deals.firstSeenAt));
      
      if (limit !== undefined) {
        query.limit(limit);
      }
      
      if (offset !== undefined) {
        query.offset(offset);
      }
      
      return query;
    }
  );

  return result;
}

export async function getTotalActiveDealsCount(_storeId?: number, _userId?: number) {
  const result = await db
    .select({ count: count() })
    .from(deals)
    .where(eq(deals.isActive, true));

  return result[0]?.count ?? 0;
}

export async function getTotalVisibleActiveDealsCount(userTelegramId: number) {
  const user = await getUserByTelegramId(userTelegramId);
  const storeId = user?.storeId ?? 25;

  const result = await db
    .select({ count: count() })
    .from(deals)
    .leftJoin(userDealPreferences, and(
      eq(userDealPreferences.dealId, deals.id),
      eq(userDealPreferences.userTelegramId, userTelegramId)
    ))
    .where(and(
      eq(deals.isActive, true),
      eq(deals.storeId, storeId),
      or(
        isNull(userDealPreferences.id),
        eq(userDealPreferences.isHidden, false)
      )
    ));

  return result[0]?.count ?? 0;
}

export async function getActiveDealsWithProductsNotHidden(
  userTelegramId: number,
  limit?: number,
  offset?: number
) {
  const user = await getUserByTelegramId(userTelegramId);
  const storeId = user?.storeId ?? 25;

  const query = db
    .select()
    .from(deals)
    .innerJoin(products, eq(deals.productId, products.id))
    .leftJoin(userDealPreferences, and(
      eq(userDealPreferences.dealId, deals.id),
      eq(userDealPreferences.userTelegramId, userTelegramId)
    ))
    .where(and(
      eq(deals.isActive, true),
      eq(deals.storeId, storeId),
      or(
        isNull(userDealPreferences.id),
        eq(userDealPreferences.isHidden, false)
      )
    ))
    .orderBy(desc(deals.firstSeenAt));

  if (limit !== undefined) {
    query.limit(limit);
  }

  if (offset !== undefined) {
    query.offset(offset);
  }

  return logSlowQuery(
    'getActiveDealsWithProductsNotHidden',
    () => query
  );
}



export async function markDealsAsInactive(dealIds: number[]) {
  if (dealIds.length === 0) return [];

  return db
    .update(deals)
    .set({ isActive: false, lastUpdatedAt: new Date() })
    .where(eq(deals.dealId, dealIds[0]))
    .returning();
}

export async function hasActiveDealsForStore(storeId: number): Promise<boolean> {
  const result = await db
    .select({ count: count() })
    .from(deals)
    .where(
      and(
        eq(deals.isActive, true),
        eq(deals.storeId, storeId)
      )
    );

  const dealCount = result[0]?.count ?? 0;
  return dealCount > 0;
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
  return logSlowQuery(
    'getUserFavoriteDeals',
    () =>
      db
        .select()
        .from(userDealPreferences)
        .leftJoin(deals, eq(userDealPreferences.dealId, deals.id))
        .leftJoin(products, eq(deals.productId, products.id))
        .where(
          and(
            eq(userDealPreferences.userTelegramId, userTelegramId),
            eq(userDealPreferences.isFavorite, true)
          )
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
  return logSlowQuery(
    'getNotificationsByUser',
    () =>
      db
        .select()
        .from(notificationLog)
        .where(eq(notificationLog.userTelegramId, userTelegramId))
        .orderBy(desc(notificationLog.sentAt))
  );
}

// ============================================
// Shopping Cart Operations
// ============================================

export async function addToCart(userTelegramId: number, dealId: number) {
  const [item] = await db
    .insert(userShoppingCart)
    .values({ userTelegramId, dealId })
    .onConflictDoNothing()
    .returning();
  return item;
}

export async function removeFromCart(userTelegramId: number, dealId: number) {
  const result = await db
    .delete(userShoppingCart)
    .where(
      and(
        eq(userShoppingCart.userTelegramId, userTelegramId),
        eq(userShoppingCart.dealId, dealId)
      )
    )
    .returning();
  return result[0];
}

export async function getUserCart(userTelegramId: number) {
  return logSlowQuery(
    'getUserCart',
    () =>
      db
        .select()
        .from(userShoppingCart)
        .innerJoin(deals, eq(userShoppingCart.dealId, deals.id))
        .leftJoin(products, eq(deals.productId, products.id))
        .where(eq(userShoppingCart.userTelegramId, userTelegramId))
        .orderBy(desc(userShoppingCart.addedAt))
  );
}

export async function clearCart(userTelegramId: number) {
  return db
    .delete(userShoppingCart)
    .where(eq(userShoppingCart.userTelegramId, userTelegramId))
    .returning();
}

export async function isInCart(userTelegramId: number, dealId: number) {
  const [item] = await db
    .select()
    .from(userShoppingCart)
    .where(
      and(
        eq(userShoppingCart.userTelegramId, userTelegramId),
        eq(userShoppingCart.dealId, dealId)
      )
    );
  return !!item;
}
