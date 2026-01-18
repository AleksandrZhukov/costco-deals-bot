import type TelegramBot from "node-telegram-bot-api";
import { getUserFavoriteDeals } from "../../database/queries.js";
import { setDealFavorite } from "../../database/queries.js";
import { formatDealMessage } from "../../utils/formatters.js";

export async function handleFavoritesCommand(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  try {
    await bot.sendMessage(chatId, "⭐ Fetching your favorites...");

    const userFavorites = await getUserFavoriteDeals(chatId);

    const activeFavorites = userFavorites.filter(
      (fav) => fav.deals && fav.deals.isActive === true
    );

    if (!activeFavorites || activeFavorites.length === 0) {
      await bot.sendMessage(chatId, "You don't have any favorited deals yet.");
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
  userId: number,
  dealId: number,
  isFavorite: boolean
): Promise<void> {
  try {
    if (isFavorite) {
      await bot.answerCallbackQuery(userId.toString(), {
        text: "⭐ Deal added to favorites!",
      });
    } else {
      await bot.answerCallbackQuery(userId.toString(), {
        text: "💔 Deal removed from favorites",
      });
    }

    await setDealFavorite(userId, dealId, isFavorite);
  } catch (error) {
    console.error("Error toggling favorite:", error);
    await bot.answerCallbackQuery(userId.toString(), {
      text: "❌ Failed to update favorite",
      show_alert: true,
    });
  }
}

