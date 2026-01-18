import cron from "node-cron";
import { env } from "../config/env.js";
import { fetchDealsForStore } from "../services/yepApi/index.js";
import { processDealsFromApi, expireExpiredDeals } from "../services/index.js";
import { getAllActiveUsers } from "../database/queries.js";

interface ParseJobOptions {
  manual?: boolean;
  storeId?: number;
}

export async function runDailyParse(options: ParseJobOptions = {}): Promise<void> {
  const { manual = false, storeId: specificStoreId } = options;

  console.log(
    `${manual ? "Manual" : "Scheduled"} daily parse started at ${new Date().toISOString()}`
  );

  try {
    const allUsers = await getAllActiveUsers();
    const uniqueStoreIds = new Set(allUsers.map((user) => user.storeId));

    console.log(`Found ${uniqueStoreIds.size} unique store(s) to process`);

    let totalProcessed = 0;
    let totalNewDeals = 0;

    for (const storeId of uniqueStoreIds) {
      if (specificStoreId && storeId !== specificStoreId) {
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
          console.error(`Failed to fetch deals for store ${storeId}:`, apiResult.error);
          continue;
        }

        console.log(`Fetched ${apiResult.deals.length} deals from API`);

        const processResult = await processDealsFromApi(apiResult.deals, storeId);

        console.log(
          `Store ${storeId} processed: ${processResult.productsCreated} products created, ${processResult.dealsCreated} deals created`
        );

        totalProcessed += apiResult.deals.length;
        totalNewDeals += processResult.newDeals.length;
      } catch (error) {
        console.error(`Error processing store ${storeId}:`, error);
      }
    }

    const expiredCount = await expireExpiredDeals();
    console.log(`Marked ${expiredCount} deals as expired`);

    console.log(
      `Daily parse complete: ${totalProcessed} total deals processed, ${totalNewDeals} new deals found`
    );
  } catch (error) {
    console.error("Fatal error in daily parse:", error);
    throw error;
  }
}

export function scheduleDailyParse(): cron.ScheduledTask | null {
  try {
    const task = cron.schedule(
      env.DAILY_PARSE_SCHEDULE,
      async () => {
        await runDailyParse();
      },
      {
        timezone: env.TIMEZONE,
      }
    );

    console.log(`✅ Daily parse scheduled: ${env.DAILY_PARSE_SCHEDULE} (${env.TIMEZONE})`);

    return task;
  } catch (error) {
    console.error("Failed to schedule daily parse:", error);
    return null;
  }
}

export async function startScheduler(): Promise<cron.ScheduledTask | null> {
  console.log("Starting scheduler...");

  const task = scheduleDailyParse();

  if (task) {
    console.log("✅ Scheduler started successfully");
  } else {
    console.error("❌ Failed to start scheduler");
  }

  console.log("Running initial parse on startup...");
  await runDailyParse({ manual: true });

  return task;
}
