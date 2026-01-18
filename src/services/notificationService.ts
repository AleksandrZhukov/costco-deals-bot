import type TelegramBot from "node-telegram-bot-api";
import { getDealWithProduct } from "../database/queries.js";
import { logNotification } from "../database/queries.js";
import { formatDealMessage } from "../utils/formatters.js";
import { createNotificationTracker, createBatchTracker } from "../utils/logger.js";

export async function sendDealNotification(
  bot: TelegramBot,
  userTelegramId: number,
  dealId: number
): Promise<boolean> {
  const tracker = createNotificationTracker(userTelegramId, String(dealId));

  try {
    const dealWithProduct = await getDealWithProduct(dealId);

    if (!dealWithProduct || !dealWithProduct.products) {
      tracker.failed(`Deal ${dealId} not found or has no product`);
      return false;
    }

    const { deals: deal, products: product } = dealWithProduct;
    const message = formatDealMessage(deal, product);

    const keyboard = {
      inline_keyboard: [
        [
          { text: "❤️ Favorite", callback_data: `favorite:${dealId}` },
          { text: "👁️ Hide", callback_data: `hide:${dealId}` },
        ],
      ],
    };

    if (product.goodsImg) {
      await bot.sendPhoto(userTelegramId, product.goodsImg, {
        caption: message,
        reply_markup: keyboard,
      });
    } else {
      await bot.sendMessage(userTelegramId, message, {
        reply_markup: keyboard,
      });
    }

    await logNotification({
      userTelegramId,
      dealId,
      wasSuccessful: true,
    });

    tracker.sent({
      storeId: 0,
      productUpc: product.itmUpcCode,
      hasImage: !!product.goodsImg,
      messageLength: message.length,
    });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await logNotification({
      userTelegramId,
      dealId,
      wasSuccessful: false,
    });

    tracker.failed(errorMessage);

    return false;
  }
}

export async function sendBatchNotifications(
  bot: TelegramBot,
  users: number[],
  dealId: number
): Promise<{ success: number; failed: number }> {
  const tracker = createBatchTracker();
  const result = { success: 0, failed: 0 };

  for (const userId of users) {
    const success = await sendDealNotification(bot, userId, dealId);

    if (success) {
      result.success++;
    } else {
      result.failed++;
    }

    const delay = (Math.random() * 1000 + 500);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  tracker.complete('notification.batch_complete', {
    total_notifications: users.length,
    success_count: result.success,
    failure_count: result.failed,
  });

  return result;
}
