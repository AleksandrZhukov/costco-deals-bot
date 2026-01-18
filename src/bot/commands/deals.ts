import type TelegramBot from "node-telegram-bot-api";
import { getActiveDealsWithProducts } from "../../database/queries.js";
import { isDealHiddenForUser } from "../../database/queries.js";
import { formatDealMessage } from "../../utils/formatters.js";
import { createUserActionTracker } from "../../utils/logger.js";

export async function handleDealsCommand(
  bot: TelegramBot,
  chatId: number,
  _storeId: number
): Promise<void> {
  const tracker = createUserActionTracker(chatId);
  let dealsShown = 0;
  let dealsHidden = 0;

  try {
    await bot.sendMessage(chatId, "🔍 Fetching current deals...");

    const deals = await getActiveDealsWithProducts();

    if (!deals || deals.length === 0) {
      await bot.sendMessage(chatId, "No active deals found for your store.");
      tracker.command('deals', {
        store_id: _storeId,
        deals_available: 0,
        deals_shown: 0,
        deals_hidden: 0,
      });
      return;
    }

    await bot.sendMessage(chatId, `📋 Found ${deals.length} active deals:`);

    for (const deal of deals) {
      if (!deal.deals || !deal.products) {
        continue;
      }

      const isHidden = await isDealHiddenForUser(chatId, deal.deals.id);

      if (isHidden) {
        dealsHidden++;
        continue;
      }

      const message = formatDealMessage(deal.deals, deal.products);

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: "❤️ Favorite",
              callback_data: `favorite:${deal.deals.id}`,
            },
            {
              text: "👁️ Hide",
              callback_data: `hide:${deal.deals.id}`,
            },
          ],
        ],
      };

      if (deal.products.goodsImg) {
        await bot.sendPhoto(chatId, deal.products.goodsImg, {
          caption: message,
          reply_markup: keyboard,
        });
      } else {
        await bot.sendMessage(chatId, message, {
          reply_markup: keyboard,
        });
      }

      dealsShown++;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    tracker.command('deals', {
      store_id: _storeId,
      deals_available: deals.length,
      deals_shown: dealsShown,
      deals_hidden: dealsHidden,
    });
  } catch (error) {
    console.error("Error in /deals command:", error);
    await bot.sendMessage(
      chatId,
      "❌ Sorry, something went wrong fetching deals."
    );
  }
}
