import TelegramBot from "node-telegram-bot-api";
import {
  getDealsForDigest,
  getUsersWhoFavoritedDeal,
  markDealAsSentInDigest,
  wasDealSentInDigest,
  getUserByTelegramId,
  getUserDealTypePreferences,
} from "../database/queries.js";
import { sendDealNotification } from "./notificationService.js";
import { log as logger } from "../utils/logger.js";
import { EventTypes } from "../utils/eventTypes.js";

const PAGE_SIZE = 10;
const NOTIFICATION_DELAY_MS = 1500;
const DIGEST_DELAY_MS = 300;

export async function sendInstantFavoriteNotification(
  bot: TelegramBot,
  dealId: number
) {
  try {
    const interestedUsers = await getUsersWhoFavoritedDeal(dealId);

    if (interestedUsers.length === 0) {
      return;
    }

    logger.info(EventTypes.NOTIFICATION_BATCH_COMPLETE, {
      message: `Sending instant notifications for deal ${dealId} to ${interestedUsers.length} users`,
      deal_id: dealId,
      user_count: interestedUsers.length
    });

    for (const { userTelegramId } of interestedUsers) {
      // Check if already sent in digest history to avoid duplicate
      const alreadySent = await wasDealSentInDigest(userTelegramId, dealId);
      if (alreadySent) {
        continue;
      }

      try {
        await bot.sendMessage(userTelegramId, "🌟 Your favorite deal is back!");
        const success = await sendDealNotification(bot, userTelegramId, dealId);
        
        if (success) {
          await markDealAsSentInDigest(userTelegramId, dealId);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(EventTypes.NOTIFICATION_FAILED, {
          user_id: userTelegramId,
          deal_id: dealId,
          error_message: errorMessage
        });
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, NOTIFICATION_DELAY_MS));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(EventTypes.NOTIFICATION_FAILED, {
      deal_id: dealId,
      error_message: errorMessage,
      context: "sendInstantFavoriteNotification"
    });
  }
}

export async function sendDailyDigestToUser(
  bot: TelegramBot,
  userTelegramId: number,
  offset: number = 0
) {
  try {
    const user = await getUserByTelegramId(userTelegramId);
    if (!user || !user.notificationsEnabled) {
      return;
    }

    // Get deal type preferences
    const typeIds = await getUserDealTypePreferences(userTelegramId);

    const deals = await getDealsForDigest(userTelegramId, PAGE_SIZE, offset, typeIds);

    if (deals.length === 0) {
      if (offset === 0) {
        // No new deals at all for today
      } else {
        await bot.sendMessage(userTelegramId, "That's all the new deals for now!");
      }
      return;
    }

    // If this is the first page, send a header
    if (offset === 0) {
      await bot.sendMessage(
        userTelegramId,
        `📅 <b>Daily Digest</b>\nFound ${deals.length >= PAGE_SIZE ? "many" : deals.length} new deals for you!`,
        { parse_mode: "HTML" }
      );
    }

    for (const dealData of deals) {
      const { deals: deal } = dealData;
      
      const success = await sendDealNotification(bot, userTelegramId, deal.dealId);
      if (success) {
        await markDealAsSentInDigest(userTelegramId, deal.dealId);
      }
      
      await new Promise((resolve) => setTimeout(resolve, DIGEST_DELAY_MS));
    }

    // If we have a full page, there might be more
    if (deals.length === PAGE_SIZE) {
      const nextOffset = offset + PAGE_SIZE;
      
      // Check if there are actually more
      const moreDeals = await getDealsForDigest(userTelegramId, 1, nextOffset, typeIds);
      if (moreDeals.length > 0) {
        await bot.sendMessage(userTelegramId, `Showing ${offset + 1}-${offset + deals.length}. Want to see more?`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "👇 Show More Deals",
                  callback_data: `digest:${nextOffset}`,
                },
              ],
            ],
          },
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(EventTypes.NOTIFICATION_FAILED, {
      user_id: userTelegramId,
      error_message: errorMessage,
      context: "sendDailyDigestToUser"
    });
  }
}

export async function sendDailyDigestToAllUsers(
  bot: TelegramBot,
  userIds: number[]
) {
  logger.info(EventTypes.NOTIFICATION_BATCH_COMPLETE, {
    message: `Starting daily digest for ${userIds.length} users`,
    user_count: userIds.length
  });
  
  for (const userId of userIds) {
    await sendDailyDigestToUser(bot, userId);
    // Add delay between users to prevent flooding
    await new Promise((resolve) => setTimeout(resolve, NOTIFICATION_DELAY_MS));
  }
  
  logger.info(EventTypes.NOTIFICATION_BATCH_COMPLETE, {
    message: "Daily digest completed"
  });
}
