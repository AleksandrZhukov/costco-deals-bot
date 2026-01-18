import type TelegramBot from "node-telegram-bot-api";
import { toggleFavorite } from "../commands/favorites.js";
import { setDealHidden } from "../../database/queries.js";
import { handleStoreChange, handleToggleNotifications } from "../commands/settings.js";
import { createUserActionTracker } from "../../utils/logger.js";
import { logError } from "../../utils/errorLogger.js";

export interface CallbackData {
  action: string;
  dealId?: number;
  storeId?: number;
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
    ];

    if (!validActions.includes(action)) {
      return null;
    }

    return result;
  } catch (error) {
    return null;
  }
}

export async function handleCallbackQuery(
  bot: TelegramBot,
  callbackQueryId: string,
  data: string,
  userId: number
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
        await toggleFavorite(bot, callbackQueryId, userId, callbackData.dealId, true);
      }
      break;

    case "unfavorite":
      if (callbackData.dealId) {
        await toggleFavorite(bot, callbackQueryId, userId, callbackData.dealId, false);
      }
      break;

    case "hide":
      if (callbackData.dealId) {
        await bot.answerCallbackQuery(callbackQueryId, {
          text: "👁️ Deal hidden",
        });
        await setDealHidden(userId, callbackData.dealId, true);
        tracker.callback('hide', { deal_id: String(callbackData.dealId) });
      }
      break;

    case "unhide":
      if (callbackData.dealId) {
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
