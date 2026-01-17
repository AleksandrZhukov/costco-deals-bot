import type TelegramBot from "node-telegram-bot-api";
import { createUser, getUserByTelegramId } from "../../database/queries.js";

const WELCOME_MESSAGE = `
🎉 Welcome to YEP Savings Deal Bot!

I'll help you track the best deals from YEP Savings. Here's what I can do:

📋 /deals - Show current active deals
⭐ /favorites - View your favorite deals
⚙️ /settings - Configure your preferences

Every deal I send you will have inline buttons to:
❤️ Mark as favorite
👁️ Hide this deal

Get notified when new deals are available for your store!
`;

const COMMANDS_LIST = `
📚 Available Commands:

/deals - Show all active deals
/favorites - Show your favorited deals
/settings - Configure store and notifications
/start - Show this welcome message
`;

export async function handleStartCommand(
  bot: TelegramBot,
  chatId: number,
  username?: string,
  firstName?: string
): Promise<void> {
  try {
    const existingUser = await getUserByTelegramId(chatId);

    if (!existingUser) {
      await createUser({
        telegramId: chatId,
        username,
        firstName,
      });
    }

    await bot.sendMessage(chatId, WELCOME_MESSAGE);
    await bot.sendMessage(chatId, COMMANDS_LIST);
  } catch (error) {
    console.error("Error in /start command:", error);
    await bot.sendMessage(
      chatId,
      "❌ Sorry, something went wrong. Please try again."
    );
  }
}
