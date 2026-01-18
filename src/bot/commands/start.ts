import type TelegramBot from "node-telegram-bot-api";
import { createUser, getUserByTelegramId } from "../../database/queries.js";
import { createUserActionTracker } from "../../utils/logger.js";

const AVAILABLE_STORES = [
  { id: 25, name: "Calgary, AB" },
  { id: 28, name: "Edmonton, AB" },
  { id: 34, name: "Langley, BC" },
  { id: 30, name: "Burlington, ON" },
  { id: 29, name: "London, ON" },
  { id: 23, name: "Mississauga & Oakville, ON" },
  { id: 31, name: "Toronto, ON" },
  { id: 19, name: "Saskatoon, SK" },
];

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
  const tracker = createUserActionTracker(chatId);

  try {
    const existingUser = await getUserByTelegramId(chatId);

    if (!existingUser) {
      await createUser({
        telegramId: chatId,
        username,
        firstName,
      });
      tracker.created();
    }

    await bot.sendMessage(chatId, WELCOME_MESSAGE);
    await bot.sendMessage(chatId, COMMANDS_LIST);

    if (!existingUser || !existingUser.storeId) {
      const storeSelectionKeyboard = {
        inline_keyboard: AVAILABLE_STORES.map((store) => [
          {
            text: `🏪 ${store.name}`,
            callback_data: `set_store:${store.id}`,
          },
        ]),
      };

      await bot.sendMessage(
        chatId,
        "📍 Please select your store to get personalized deals:",
        { reply_markup: storeSelectionKeyboard }
      );
    }

    tracker.command('start', {
      existing_user: !!existingUser,
      username,
      first_name: firstName,
    });
  } catch (error) {
    console.error("Error in /start command:", error);
    await bot.sendMessage(
      chatId,
      "❌ Sorry, something went wrong. Please try again."
    );
  }
}
