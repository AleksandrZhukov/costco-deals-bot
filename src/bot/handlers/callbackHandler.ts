import type TelegramBot from "node-telegram-bot-api";

export interface CallbackData {
  action: string;
  dealId: number;
}

export function parseCallbackData(data: string): CallbackData | null {
  try {
    const [action, dealIdStr] = data.split(":");

    if (!action || !dealIdStr) {
      return null;
    }

    const dealId = parseInt(dealIdStr, 10);

    if (isNaN(dealId)) {
      return null;
    }

    const validActions = ["favorite", "unfavorite", "hide", "unhide"];

    if (!validActions.includes(action)) {
      return null;
    }

    return { action, dealId };
  } catch (error) {
    return null;
  }
}

export async function handleCallbackQuery(
  bot: TelegramBot,
  queryId: string,
  data: string
): Promise<void> {
  const callbackData = parseCallbackData(data);

  if (!callbackData) {
    await bot.answerCallbackQuery(queryId, {
      text: "❌ Invalid action",
      show_alert: true,
    });
    return;
  }

  switch (callbackData.action) {
    case "favorite":
      await bot.answerCallbackQuery(queryId, {
        text: "⭐ Deal added to favorites!",
      });
      break;

    case "unfavorite":
      await bot.answerCallbackQuery(queryId, {
        text: "💔 Deal removed from favorites",
      });
      break;

    case "hide":
      await bot.answerCallbackQuery(queryId, {
        text: "👁️ Deal hidden",
      });
      break;

    case "unhide":
      await bot.answerCallbackQuery(queryId, {
        text: "✅ Deal visible again",
      });
      break;

    default:
      await bot.answerCallbackQuery(queryId, {
        text: "❌ Unknown action",
        show_alert: true,
      });
  }
}
