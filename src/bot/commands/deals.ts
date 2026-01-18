import type TelegramBot from "node-telegram-bot-api";
import { getActiveDealsWithProducts, getTotalActiveDealsCount } from "../../database/queries.js";
import { isDealHiddenForUser } from "../../database/queries.js";
import { formatDealMessage } from "../../utils/formatters.js";
import { createUserActionTracker } from "../../utils/logger.js";

const PAGE_SIZE = 10;

export async function handleDealsCommand(
  bot: TelegramBot,
  chatId: number,
  _storeId: number,
  offset: number = 0
): Promise<void> {
  const tracker = createUserActionTracker(chatId);
  let dealsShown = 0;
  let dealsHidden = 0;

  try {
    if (offset === 0) {
      await bot.sendMessage(chatId, "🔍 Fetching current deals...");
    }

    const [deals, totalCount] = await Promise.all([
      getActiveDealsWithProducts(PAGE_SIZE, offset),
      getTotalActiveDealsCount(),
    ]);

    if (!deals || deals.length === 0) {
      if (offset === 0) {
        await bot.sendMessage(chatId, "No active deals found for your store.");
        tracker.command('deals', {
          store_id: _storeId,
          deals_available: 0,
          deals_shown: 0,
          deals_hidden: 0,
        });
      }
      return;
    }

    const startCount = offset + 1;

    if (offset === 0) {
      await bot.sendMessage(chatId, `📋 Found ${totalCount} active deals:`);
    }

    const visibleDeals: Array<{ deal: any; products: any; message: string }> = [];

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
      visibleDeals.push({ deal: deal.deals, products: deal.products, message });

      dealsShown++;
    }

    for (const { deal, products, message } of visibleDeals) {
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: "❤️ Favorite",
              callback_data: `favorite:${deal.id}`,
            },
            {
              text: "👁️ Hide",
              callback_data: `hide:${deal.id}`,
            },
          ],
        ],
      };

      if (products.goodsImg) {
        await bot.sendPhoto(chatId, products.goodsImg, {
          caption: message,
          reply_markup: keyboard,
        });
      } else {
        await bot.sendMessage(chatId, message, {
          reply_markup: keyboard,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (offset + dealsShown < totalCount) {
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: "Show More",
              callback_data: `page:${offset + PAGE_SIZE}`,
            },
          ],
        ],
      };

      const finalCountText = `Showing ${startCount}-${Math.min(offset + dealsShown, totalCount)} of ${totalCount} deals`;

      await bot.sendMessage(chatId, finalCountText, {
        reply_markup: keyboard,
      });
    } else if (dealsShown > 0) {
      const finalCountText = `Showing ${startCount}-${offset + dealsShown} of ${totalCount} deals`;
      await bot.sendMessage(chatId, finalCountText);
    }

    tracker.command('deals', {
      store_id: _storeId,
      deals_available: totalCount,
      deals_shown: offset + dealsShown,
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

export async function handlePagination(
  bot: TelegramBot,
  chatId: number,
  storeId: number,
  offset: number
): Promise<void> {
  await handleDealsCommand(bot, chatId, storeId, offset);
}
