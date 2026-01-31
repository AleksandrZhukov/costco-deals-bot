import TelegramBot from "node-telegram-bot-api";
import { sendDailyDigestToUser } from "../../services/digestService.js";
import { log as logger } from "../../utils/logger.js";
import { EventTypes } from "../../utils/eventTypes.js";

export async function handleDigestCallback(
  bot: TelegramBot,
  callbackQueryId: string,
  userId: number,
  offset: number
) {
  try {
    await bot.answerCallbackQuery(callbackQueryId);
    
    await sendDailyDigestToUser(bot, userId, offset);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(EventTypes.USER_CALLBACK, {
      callback_action: "digest",
      error_message: errorMessage,
      user_id: userId
    });
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Error loading more deals",
      show_alert: true
    });
  }
}
