import type TelegramBot from "node-telegram-bot-api";
import { setDealHidden, addToCart, removeFromCart, isInCart, setDealFavorite, isDealFavorited } from "../../database/queries.js";
import { handleStoreChange, handleToggleNotifications } from "../commands/settings.js";
import { handlePagination } from "../commands/deals.js";
import { removeFromCartCallback, clearCartCallback, cartSummaryCallback } from "../commands/cart.js";
import { handleToggleType, handleSelectAllTypes, handleClearAllTypes, sendTypeSelectorMessage } from "../commands/dealTypes.js";
import { createUserActionTracker } from "../../utils/logger.js";
import { logError } from "../../utils/errorLogger.js";

export interface CallbackData {
  action: string;
  dealId?: number;
  storeId?: number;
  offset?: number;
}

export function parseCallbackData(data: string): CallbackData | null {
  try {
    const parts = data.split(":");

    if (parts.length === 0 || !parts[0]) {
      return null;
    }

    const action = parts[0];
    const result: CallbackData = { action };

    if (parts.length > 1 && parts[1]) {
      const id = parseInt(parts[1], 10);

      if (!isNaN(id)) {
        if (action === "set_store") {
          result.storeId = id;
        } else if (action === "page") {
          result.offset = id;
        } else {
          result.dealId = id;
        }
      }
    }

    const validActions = [
      "favorite",
      "unfavorite",
      "hide",
      "unhide",
      "set_store",
      "toggle_notifications",
      "page",
      "clearcart",
      "removecart",
      "addcart",
      "remcart",
      "cartsummary",
      "cart",
      "toggle_type",
      "select_all_types",
      "clear_all_types",
      "back_to_settings",
      "deal_types",
    ];

    if (!validActions.includes(action)) {
      return null;
    }

    return result;
  } catch (error) {
    return null;
  }
}

async function addToCartCallback(
  bot: TelegramBot,
  callbackQueryId: string,
  userId: number,
  dealId: number,
  callbackMessage?: any
): Promise<void> {
  const tracker = createUserActionTracker(userId);

  try {
    await addToCart(userId, dealId);

    const isFavorited = await isDealFavorited(userId, dealId);

    const keyboard = {
      inline_keyboard: [
        [
          { text: isFavorited ? "💔 Unfavorite" : "❤️ Favorite", callback_data: isFavorited ? `unfavorite:${dealId}` : `favorite:${dealId}` },
          { text: "👁️ Hide", callback_data: `hide:${dealId}` },
        ],
        [
          { text: "✅ In Cart", callback_data: `remcart:${dealId}` },
        ],
      ],
    };

    if (callbackMessage) {
      await bot.editMessageReplyMarkup(keyboard, {
        chat_id: callbackMessage.chat.id,
        message_id: callbackMessage.message_id,
      });
    }

    await bot.answerCallbackQuery(callbackQueryId, {
      text: "🛒 Deal added to cart!",
    });

    tracker.callback('addcart', {
      deal_id: String(dealId),
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Failed to add item to cart",
      show_alert: true,
    });
  }
}

async function removeCartFromDealCallback(
  bot: TelegramBot,
  callbackQueryId: string,
  userId: number,
  dealId: number,
  callbackMessage?: any
): Promise<void> {
  const tracker = createUserActionTracker(userId);

  try {
    await removeFromCart(userId, dealId);

    const isFavorited = await isDealFavorited(userId, dealId);

    const keyboard = {
      inline_keyboard: [
        [
          { text: isFavorited ? "💔 Unfavorite" : "❤️ Favorite", callback_data: isFavorited ? `unfavorite:${dealId}` : `favorite:${dealId}` },
          { text: "👁️ Hide", callback_data: `hide:${dealId}` },
        ],
        [
          { text: "🛒 Add to Cart", callback_data: `addcart:${dealId}` },
        ],
      ],
    };

    if (callbackMessage) {
      await bot.editMessageReplyMarkup(keyboard, {
        chat_id: callbackMessage.chat.id,
        message_id: callbackMessage.message_id,
      });
    }

    await bot.answerCallbackQuery(callbackQueryId, {
      text: "🗑️ Deal removed from cart",
    });

    tracker.callback('remcart', {
      deal_id: String(dealId),
    });
  } catch (error) {
    console.error("Error removing from cart:", error);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Failed to remove item from cart",
      show_alert: true,
    });
  }
}

export async function handleCallbackQuery(
  bot: TelegramBot,
  callbackQueryId: string,
  data: string,
  userId: number,
  callbackMessage?: any
): Promise<void> {
  const callbackData = parseCallbackData(data);

  if (!callbackData) {
    const tracker = createUserActionTracker(userId);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Invalid action",
      show_alert: true,
    });
    logError(new Error(`Invalid callback data: ${data}`), {
      error_type: 'error.validation',
      user_id: userId,
      callback_data: data,
    });
    tracker.callback('invalid', { callback_data: data });
    return;
  }

  const tracker = createUserActionTracker(userId);

  switch (callbackData.action) {
    case "favorite":
      if (callbackData.dealId) {
        const inCart = await isInCart(userId, callbackData.dealId);
        const keyboard = {
          inline_keyboard: [
            [
              { text: "💔 Unfavorite", callback_data: `unfavorite:${callbackData.dealId}` },
              { text: "👁️ Hide", callback_data: `hide:${callbackData.dealId}` },
            ],
            [
              {
                text: inCart ? "✅ In Cart" : "🛒 Add to Cart",
                callback_data: inCart ? `remcart:${callbackData.dealId}` : `addcart:${callbackData.dealId}`,
              },
            ],
          ],
        };
        if (callbackMessage) {
          await bot.editMessageReplyMarkup(keyboard, {
            chat_id: callbackMessage.chat.id,
            message_id: callbackMessage.message_id,
          });
        }
        await bot.answerCallbackQuery(callbackQueryId, {
          text: "⭐ Deal added to favorites!",
        });
        await setDealFavorite(userId, callbackData.dealId, true);
        tracker.callback('favorite', { deal_id: String(callbackData.dealId) });
      }
      break;

    case "unfavorite":
      if (callbackData.dealId) {
        const inCart = await isInCart(userId, callbackData.dealId);
        const keyboard = {
          inline_keyboard: [
            [
              { text: "❤️ Favorite", callback_data: `favorite:${callbackData.dealId}` },
              { text: "👁️ Hide", callback_data: `hide:${callbackData.dealId}` },
            ],
            [
              {
                text: inCart ? "✅ In Cart" : "🛒 Add to Cart",
                callback_data: inCart ? `remcart:${callbackData.dealId}` : `addcart:${callbackData.dealId}`,
              },
            ],
          ],
        };
        if (callbackMessage) {
          await bot.editMessageReplyMarkup(keyboard, {
            chat_id: callbackMessage.chat.id,
            message_id: callbackMessage.message_id,
          });
        }
        await bot.answerCallbackQuery(callbackQueryId, {
          text: "💔 Deal removed from favorites",
        });
        await setDealFavorite(userId, callbackData.dealId, false);
        tracker.callback('unfavorite', { deal_id: String(callbackData.dealId) });
      }
      break;

    case "hide":
      if (callbackData.dealId) {
        const keyboard = {
          inline_keyboard: [
            [
              { text: "👁️ Unhide", callback_data: `unhide:${callbackData.dealId}` },
            ],
          ],
        };
        if (callbackMessage) {
          await bot.editMessageReplyMarkup(keyboard, {
            chat_id: callbackMessage.chat.id,
            message_id: callbackMessage.message_id,
          });
        }
        await bot.answerCallbackQuery(callbackQueryId, {
          text: "👁️ Deal hidden",
        });
        await setDealHidden(userId, callbackData.dealId, true);
        tracker.callback('hide', { deal_id: String(callbackData.dealId) });
      }
      break;

    case "unhide":
      if (callbackData.dealId) {
        const inCart = await isInCart(userId, callbackData.dealId);
        const isFavorited = await isDealFavorited(userId, callbackData.dealId);
        const keyboard = {
          inline_keyboard: [
            [
              { text: isFavorited ? "💔 Unfavorite" : "❤️ Favorite", callback_data: isFavorited ? `unfavorite:${callbackData.dealId}` : `favorite:${callbackData.dealId}` },
              { text: "👁️ Hide", callback_data: `hide:${callbackData.dealId}` },
            ],
            inCart
              ? [{ text: "✅ In Cart", callback_data: `remcart:${callbackData.dealId}` }]
              : [{ text: "🛒 Add to Cart", callback_data: `addcart:${callbackData.dealId}` }],
          ],
        };
        if (callbackMessage) {
          await bot.editMessageReplyMarkup(keyboard, {
            chat_id: callbackMessage.chat.id,
            message_id: callbackMessage.message_id,
          });
        }
        await bot.answerCallbackQuery(callbackQueryId, {
          text: "✅ Deal visible again",
        });
        await setDealHidden(userId, callbackData.dealId, false);
        tracker.callback('unhide', { deal_id: String(callbackData.dealId) });
      }
      break;

    case "set_store":
      if (callbackData.storeId) {
        await handleStoreChange(bot, callbackQueryId, userId, callbackData.storeId);
      }
      break;

    case "toggle_notifications":
      await handleToggleNotifications(bot, callbackQueryId, userId);
      break;

    case "page":
      if (callbackData.offset !== undefined) {
        await bot.answerCallbackQuery(callbackQueryId);
        const { getUserByTelegramId } = await import("../../database/queries.js");
        const user = await getUserByTelegramId(userId);
        if (!user?.storeId) {
          await bot.sendMessage(userId, "Please configure your store in settings to view deals.");
          return;
        }
        await handlePagination(bot, userId, user.storeId, callbackData.offset);
        tracker.callback('page', { offset: String(callbackData.offset) });
      }
      break;

    case "clearcart":
      await clearCartCallback(bot, callbackQueryId, userId);
      break;

    case "removecart":
      if (callbackData.dealId) {
        await removeFromCartCallback(bot, callbackQueryId, userId, callbackData.dealId);
      }
      break;

    case "addcart":
      if (callbackData.dealId) {
        await addToCartCallback(bot, callbackQueryId, userId, callbackData.dealId, callbackMessage);
      }
      break;

    case "remcart":
      if (callbackData.dealId) {
        await removeCartFromDealCallback(bot, callbackQueryId, userId, callbackData.dealId, callbackMessage);
      }
      break;

    case "cartsummary":
      await cartSummaryCallback(bot, callbackQueryId, userId);
      break;

    case "cart":
      const { handleCartCommand } = await import("../commands/cart.js");
      await bot.answerCallbackQuery(callbackQueryId);
      await handleCartCommand(bot, userId);
      break;

    case "toggle_type":
      if (callbackData.dealId) { // We reused dealId for typeId in parsing logic if it's just a number
        await handleToggleType(bot, callbackQueryId, userId, callbackData.dealId, callbackMessage);
      }
      break;

    case "select_all_types":
      await handleSelectAllTypes(bot, callbackQueryId, userId, callbackMessage);
      break;

    case "clear_all_types":
      await handleClearAllTypes(bot, callbackQueryId, userId, callbackMessage);
      break;

    case "back_to_settings":
      const { handleSettingsCommand } = await import("../commands/settings.js");
      await bot.answerCallbackQuery(callbackQueryId);
      // If we have a message, we can edit it back to settings instead of sending a new one
      // But handleSettingsCommand sends a new message. For better UX we might want to edit.
      // For now, let's just call the command handler which is consistent with other actions.
      await handleSettingsCommand(bot, userId);
      break;
      
    case "deal_types":
      await bot.answerCallbackQuery(callbackQueryId);
      await sendTypeSelectorMessage(bot, userId);
      break;

    default:
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "❌ Unknown action",
        show_alert: true,
      });
      logError(new Error(`Unknown callback action: ${callbackData.action}`), {
        error_type: 'error.validation',
        user_id: userId,
        callback_action: callbackData.action,
      });
      tracker.callback('unknown', { callback_action: callbackData.action });
  }
}
