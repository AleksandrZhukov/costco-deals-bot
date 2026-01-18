import type TelegramBot from "node-telegram-bot-api";
import { getUserCart, removeFromCart, clearCart } from "../../database/queries.js";
import { formatDealMessage, formatPrice } from "../../utils/formatters.js";
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

    const actionKeyboard = {
      inline_keyboard: [
        [
          {
            text: "📋 Show Summary",
            callback_data: "cartsummary",
          },
          {
            text: "🧹 Clear Cart",
            callback_data: "clearcart",
          },
        ],
      ],
    };

    await bot.sendMessage(chatId, "", {
      reply_markup: actionKeyboard,
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

export async function handleCartSummary(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  const tracker = createUserActionTracker(chatId);

  try {
    const cartItems = await getUserCart(chatId);

    if (!cartItems || cartItems.length === 0) {
      await bot.sendMessage(chatId, "Empty Cart");
      tracker.callback('cartsummary', {
        cart_items: 0,
      });
      return;
    }

    let summary = "📋 *Cart Summary*\n\n";

    let totalPrice = 0;
    cartItems.forEach((item, index) => {
      if (!item.deals || !item.products) {
        return;
      }

      const deal = item.deals;
      const product = item.products;

      const price = formatPrice(deal.discountPrice || deal.currentPrice);
      if (price !== "N/A") {
        totalPrice += parseFloat(price.replace("$", ""));
      }

      const brand = product.brand.substring(0, 20);
      const productName = product.name ? product.name.substring(0, 20) : "";
      
      summary += `${index + 1}. ${brand} - ${productName} - ${price}\n`;
    });

    summary += `\n💰 *Total: $${totalPrice.toFixed(2)}*`;

    const backKeyboard = {
      inline_keyboard: [
        [
          {
            text: "⬅️ Back to Cart",
            callback_data: "cart",
          },
        ],
      ],
    };

    await bot.sendMessage(chatId, summary, {
      parse_mode: "Markdown",
      reply_markup: backKeyboard,
    });

    tracker.callback('cartsummary', {
      cart_items: cartItems.length,
      total_price: totalPrice.toFixed(2),
    });
  } catch (error) {
    console.error("Error in handleCartSummary:", error);
    await bot.sendMessage(
      chatId,
      "❌ Sorry, something went wrong generating your cart summary."
    );
  }
}

export async function cartSummaryCallback(
  bot: TelegramBot,
  callbackQueryId: string,
  userId: number
): Promise<void> {
  try {
    await bot.answerCallbackQuery(callbackQueryId);
    await handleCartSummary(bot, userId);
  } catch (error) {
    console.error("Error in cartSummaryCallback:", error);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Failed to show summary",
      show_alert: true,
    });
  }
}
