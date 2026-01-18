import type TelegramBot from "node-telegram-bot-api";
import { getUserCart, removeFromCart, clearCart } from "../../database/queries.js";
import { formatDealMessage } from "../../utils/formatters.js";
import { createUserActionTracker } from "../../utils/logger.js";

export async function handleCartCommand(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  const tracker = createUserActionTracker(chatId);

  try {
    await bot.sendMessage(chatId, "🛒 Fetching your shopping cart...");

    const cartItems = await getUserCart(chatId);

    if (!cartItems || cartItems.length === 0) {
      await bot.sendMessage(chatId, "Empty Cart");
      tracker.command('cart', {
        cart_items: 0,
      });
      return;
    }

    await bot.sendMessage(
      chatId,
      `Shopping Cart (${cartItems.length} items)`
    );

    for (const item of cartItems) {
      if (!item.deals || !item.products) {
        continue;
      }

      const deal = item.deals;
      const product = item.products;

      const message = formatDealMessage(deal, product);

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: "🗑️ Remove",
              callback_data: `removecart:${deal.id}`,
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

    const clearKeyboard = {
      inline_keyboard: [
        [
          {
            text: "🧹 Clear Cart",
            callback_data: "clearcart",
          },
        ],
      ],
    };

    await bot.sendMessage(chatId, "", {
      reply_markup: clearKeyboard,
    });

    tracker.command('cart', {
      cart_items: cartItems.length,
    });
  } catch (error) {
    console.error("Error in /cart command:", error);
    await bot.sendMessage(
      chatId,
      "❌ Sorry, something went wrong fetching your cart."
    );
  }
}

export async function removeFromCartCallback(
  bot: TelegramBot,
  callbackQueryId: string,
  userId: number,
  dealId: number
): Promise<void> {
  const tracker = createUserActionTracker(userId);

  try {
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "🗑️ Item removed from cart",
    });

    await removeFromCart(userId, dealId);

    tracker.callback('removecart', {
      deal_id: String(dealId),
    });
  } catch (error) {
    console.error("Error removing from cart:", error);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Failed to remove item",
      show_alert: true,
    });
  }
}

export async function clearCartCallback(
  bot: TelegramBot,
  callbackQueryId: string,
  userId: number
): Promise<void> {
  const tracker = createUserActionTracker(userId);

  try {
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "🧹 Cart cleared",
    });

    await clearCart(userId);

    tracker.callback('clearcart', {});
  } catch (error) {
    console.error("Error clearing cart:", error);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Failed to clear cart",
      show_alert: true,
    });
  }
}
