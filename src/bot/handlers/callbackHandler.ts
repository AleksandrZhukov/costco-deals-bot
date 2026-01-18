import type TelegramBot from "node-telegram-bot-api";
import { toggleFavorite } from "../commands/favorites.js";
import { setDealHidden } from "../../database/queries.js";
import { handleStoreChange, handleToggleNotifications } from "../commands/settings.js";

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
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Invalid action",
      show_alert: true,
    });
    return;
  }

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
      }
      break;

    case "unhide":
      if (callbackData.dealId) {
        await bot.answerCallbackQuery(callbackQueryId, {
          text: "✅ Deal visible again",
        });
        await setDealHidden(userId, callbackData.dealId, false);
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
  }
}
