import { fetchDealsForStore } from "../services/yepApi/index.js";
import {
  processDealsFromApi,
  expireExpiredDeals,
  sendInstantFavoriteNotification,
  sendDailyDigestToAllUsers,
} from "../services/index.js";
import { getAllActiveUsers, hasActiveDealsForStore } from "../database/queries.js";
import { createJobTracker } from "../utils/logger.js";
import { logError } from "../utils/errorLogger.js";
import { bot } from "../config/telegram.js";

interface ParseJobOptions {
  manual?: boolean;
  storeId?: number;
}

export async function runDailyParse(options: ParseJobOptions = {}): Promise<void> {
  const { manual = false, storeId: specificStoreId } = options;

  console.log(
    `${manual ? "Manual" : "Scheduled"} daily parse started at ${new Date().toISOString()}`
  );

  const jobTracker = createJobTracker('daily_parse', manual);

  try {
    const allUsers = await getAllActiveUsers();
    const uniqueStoreIds = new Set(
      allUsers.map((user) => user.storeId).filter((id): id is number => id !== null)
    );

    console.log(`Found ${uniqueStoreIds.size} unique store(s) to process`);

    let totalProcessed = 0;
    let totalNewDeals = 0;
    let errorsEncountered = 0;
    const errors: Array<{ storeId: number; error: string }> = [];

    for (const storeId of uniqueStoreIds) {
      if (specificStoreId && storeId !== specificStoreId) {
        continue;
      }

      if (specificStoreId && await hasActiveDealsForStore(storeId)) {
        console.log(`Skipping store ID: ${storeId} - deals already exist`);
        continue;
      }

      console.log(`Processing store ID: ${storeId}`);

      try {
        const apiResult = await fetchDealsForStore({
          storeId,
          pageNum: 1,
          pageSize: 1000,
        });

        if (!apiResult.success || !apiResult.deals) {
          const errorMsg = `Failed to fetch deals for store ${storeId}: ${apiResult.error}`;
          console.error(errorMsg);
          errorsEncountered++;
          errors.push({ storeId, error: apiResult.error || 'Unknown error' });
          continue;
        }

        console.log(`Fetched ${apiResult.deals.length} deals from API`);

        const processResult = await processDealsFromApi(apiResult.deals, storeId);

        console.log(
          `Store ${storeId} processed: ${processResult.productsCreated} products created, ${processResult.dealsCreated} deals created`
        );

        totalProcessed += apiResult.deals.length;
        totalNewDeals += processResult.newDeals.length;

        // Send instant notifications for favorite deals that reappeared
        for (const newDeal of processResult.newDeals) {
          await sendInstantFavoriteNotification(bot, newDeal.dealId);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error processing store ${storeId}:`, error);
        errorsEncountered++;
        errors.push({ storeId, error: errorMessage });
        logError(error, {
          error_type: 'error.database',
          fn_name: 'runDailyParse',
          store_id: storeId,
        });
      }
    }

    const expiredCount = await expireExpiredDeals();
    console.log(`Marked ${expiredCount} deals as expired`);

    // Send daily digests to all active users
    console.log("Sending daily digests...");
    const userIds = allUsers.map((user) => user.telegramId);
    await sendDailyDigestToAllUsers(bot, userIds);

    console.log(
      `Daily parse complete: ${totalProcessed} total deals processed, ${totalNewDeals} new deals found, ${errorsEncountered} errors`
    );

    jobTracker.complete({
      storesCount: uniqueStoreIds.size,
      dealsProcessed: totalProcessed,
      newDealsFound: totalNewDeals,
      notificationsSent: 0,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Fatal error in daily parse:", error);

    logError(error, {
      error_type: 'error.database',
      fn_name: 'runDailyParse',
    });

    jobTracker.error(errorMessage);

    throw error;
  }
}
