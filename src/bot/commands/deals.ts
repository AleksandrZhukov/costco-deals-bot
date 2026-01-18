import type TelegramBot from "node-telegram-bot-api";
import { getActiveDealsWithProductsNotHidden, getTotalVisibleActiveDealsCount, getUserByTelegramId } from "../../database/queries.js";
import { isInCart, isDealFavorited } from "../../database/queries.js";
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

  try {
    const user = await getUserByTelegramId(chatId);

    if (!user || !user.storeId) {
      if (offset === 0) {
        await bot.sendMessage(chatId, "Please configure your store in settings to view deals.");
      }
      return;
    }

    if (offset === 0) {
      await bot.sendMessage(chatId, "🔍 Fetching current deals...");
    }

    const [deals, totalCount] = await Promise.all([
      getActiveDealsWithProductsNotHidden(chatId, PAGE_SIZE, offset),
      getTotalVisibleActiveDealsCount(chatId),
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

      const message = formatDealMessage(deal.deals, deal.products);
      visibleDeals.push({ deal: deal.deals, products: deal.products, message });
    }

    for (const { deal, products, message } of visibleDeals) {
      const inCart = await isInCart(chatId, deal.id);
      const isFavorited = await isDealFavorited(chatId, deal.id);

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: isFavorited ? "💔 Unfavorite" : "❤️ Favorite",
              callback_data: isFavorited ? `unfavorite:${deal.id}` : `favorite:${deal.id}`,
            },
            {
              text: "👁️ Hide",
              callback_data: `hide:${deal.id}`,
            },
          ],
          [
            {
              text: inCart ? "✅ In Cart" : "🛒 Add to Cart",
              callback_data: inCart ? `remcart:${deal.id}` : `addcart:${deal.id}`,
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

    const dealsShown = visibleDeals.length;

    if (offset + PAGE_SIZE < totalCount) {
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

      const finalCountText = `Showing ${startCount}-${Math.min(startCount + dealsShown - 1, totalCount)} of ${totalCount} deals`;

      await bot.sendMessage(chatId, finalCountText, {
        reply_markup: keyboard,
      });
    } else if (dealsShown > 0) {
      const finalCountText = `Showing ${startCount}-${startCount + dealsShown - 1} of ${totalCount} deals`;
      await bot.sendMessage(chatId, finalCountText);
    }

    tracker.command('deals', {
      store_id: _storeId,
      deals_available: totalCount,
      deals_shown: offset + dealsShown,
      deals_hidden: 0,
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
