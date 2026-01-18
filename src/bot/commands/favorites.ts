import type TelegramBot from "node-telegram-bot-api";
import { getUserFavoriteDeals } from "../../database/queries.js";
import { setDealFavorite } from "../../database/queries.js";
import { isInCart } from "../../database/queries.js";
import { formatDealMessage } from "../../utils/formatters.js";
import { createUserActionTracker } from "../../utils/logger.js";

export async function handleFavoritesCommand(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  const tracker = createUserActionTracker(chatId);

  try {
    await bot.sendMessage(chatId, "⭐ Fetching your favorites...");

    const userFavorites = await getUserFavoriteDeals(chatId);

    const activeFavorites = userFavorites.filter(
      (fav) => fav.deals && fav.deals.isActive === true
    );

    if (!activeFavorites || activeFavorites.length === 0) {
      await bot.sendMessage(chatId, "You don't have any favorited deals yet.");
      tracker.command('favorites', {
        favorites_count: 0,
        active_favorites: 0,
      });
      return;
    }

    await bot.sendMessage(
      chatId,
      `⭐ You have ${activeFavorites.length} favorited deals:`
    );

    for (const fav of activeFavorites) {
      if (!fav.deals || !fav.products) {
        continue;
      }

      const deal = fav.deals;
      const product = fav.products;

      const message = formatDealMessage(deal, product);
      const inCart = await isInCart(chatId, deal.id);

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: "💔 Remove from favorites",
              callback_data: `unfavorite:${deal.id}`,
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

      if (product.goodsImg) {
        await bot.sendPhoto(chatId, product.goodsImg, {
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

    tracker.command('favorites', {
      favorites_count: userFavorites.length,
      active_favorites: activeFavorites.length,
    });
  } catch (error) {
    console.error("Error in /favorites command:", error);
    await bot.sendMessage(
      chatId,
      "❌ Sorry, something went wrong fetching your favorites."
    );
  }
}

export async function toggleFavorite(
  bot: TelegramBot,
  callbackQueryId: string,
  userId: number,
  dealId: number,
  isFavorite: boolean
): Promise<void> {
  const tracker = createUserActionTracker(userId);

  try {
    if (isFavorite) {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "⭐ Deal added to favorites!",
      });
    } else {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "💔 Deal removed from favorites",
      });
    }

    await setDealFavorite(userId, dealId, isFavorite);

    tracker.callback(isFavorite ? 'favorite' : 'unfavorite', {
      deal_id: String(dealId),
    });
  } catch (error) {
    console.error("Error toggling favorite:", error);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Failed to update favorite",
      show_alert: true,
    });
  }
}

