import type { deals } from "../database/schema.js";
import { getDealByDealId } from "../database/queries.js";

type Deal = typeof deals.$inferSelect;

export interface CompareDealsOptions {
  apiDeals: number[];
  storeId?: number;
}

export interface CompareDealsResult {
  newDeals: Deal[];
  updatedDeals: Deal[];
}

export async function findNewDeals(
  apiDeals: number[]
): Promise<Deal[]> {
  const newDeals: Deal[] = [];

  for (const dealId of apiDeals) {
    const existingDeal = await getDealByDealId(dealId);

    if (!existingDeal || !existingDeal.firstSeenAt) {
      continue;
    }

    const isNewDeal = existingDeal.isLatest === true;

    if (isNewDeal) {
      const timeDiff = Date.now() - existingDeal.firstSeenAt.getTime();
      const isNewlyCreated = timeDiff < 3600000;

      if (isNewlyCreated) {
        newDeals.push(existingDeal);
      }
    }
  }

  return newDeals;
}

export async function compareDeals(
  apiDealIds: number[]
): Promise<CompareDealsResult> {
  const result: CompareDealsResult = {
    newDeals: [],
    updatedDeals: [],
  };

  const newDeals = await findNewDeals(apiDealIds);
  result.newDeals = newDeals;

  return result;
}

export async function getDealsNeedingNotification(dealIds: number[]): Promise<Deal[]> {
  const deals: Deal[] = [];

  for (const dealId of dealIds) {
    const deal = await getDealByDealId(dealId);

    if (!deal || !deal.firstSeenAt) {
      continue;
    }

    const isEligibleForNotification =
      deal.isActive === true &&
      deal.isLatest === true;

    const timeSinceCreation = Date.now() - deal.firstSeenAt.getTime();
    const isRecentlyCreated = timeSinceCreation < 3600000;

    if (isEligibleForNotification && isRecentlyCreated) {
      deals.push(deal);
    }
  }

  return deals;
}
