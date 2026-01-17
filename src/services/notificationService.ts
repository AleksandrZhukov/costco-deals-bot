import type TelegramBot from "node-telegram-bot-api";
import { getDealWithProduct } from "../database/queries.js";
import { logNotification } from "../database/queries.js";
import { formatDealMessage } from "../utils/formatters.js";

export async function sendDealNotification(
  bot: TelegramBot,
  userTelegramId: number,
  dealId: number
): Promise<boolean> {
  try {
    const dealWithProduct = await getDealWithProduct(dealId);

    if (!dealWithProduct || !dealWithProduct.products) {
      console.error(`Deal ${dealId} not found or has no product`);
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

    return true;
  } catch (error) {
    console.error(`Error sending notification to user ${userTelegramId} for deal ${dealId}:`, error);

    await logNotification({
      userTelegramId,
      dealId,
      wasSuccessful: false,
    });

    return false;
  }
}

export async function sendBatchNotifications(
  bot: TelegramBot,
  users: number[],
  dealId: number
): Promise<{ success: number; failed: number }> {
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

  return result;
}
