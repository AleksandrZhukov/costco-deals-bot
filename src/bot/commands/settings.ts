import type TelegramBot from "node-telegram-bot-api";
import { getUserByTelegramId } from "../../database/queries.js";
import { updateUserStoreId } from "../../database/queries.js";
import { updateUserNotifications } from "../../database/queries.js";
import { createUserActionTracker } from "../../utils/logger.js";
import { runDailyParse } from "../../schedulers/dailyParser.js";
import { hasActiveDealsForStore } from "../../database/queries.js";

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

export async function handleSettingsCommand(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  const tracker = createUserActionTracker(chatId);

  try {
    const user = await getUserByTelegramId(chatId);

    if (!user) {
      await bot.sendMessage(
        chatId,
        "❌ User not found. Please use /start to initialize your account."
      );
      tracker.command('settings', {
        user_found: false,
      });
      return;
    }

    const storeName =
      AVAILABLE_STORES.find((s) => s.id === user.storeId)?.name || "Not set";
    const notifStatus = user.notificationsEnabled ? "✅ Enabled" : "❌ Disabled";

    const message = `
⚙️ **Current Settings**

🏪 **Store:** ${storeName}${user.storeId ? ` (ID: ${user.storeId})` : ""}
🔔 **Notifications:** ${notifStatus}

Click the buttons below to change your settings:
`;

    const keyboard = {
      inline_keyboard: [
        ...AVAILABLE_STORES.map((store) => [
          {
            text: `🏪 ${store.name}`,
            callback_data: `set_store:${store.id}`,
          },
        ]),
        [
          {
            text: `🔔 Toggle Notifications (${
              user.notificationsEnabled ? "ON" : "OFF"
            })`,
            callback_data: "toggle_notifications",
          },
        ],
      ],
    };

    await bot.sendMessage(chatId, message, { reply_markup: keyboard });

    tracker.command('settings', {
      user_found: true,
      store_id: user.storeId,
      notifications_enabled: user.notificationsEnabled,
    });
  } catch (error) {
    console.error("Error in /settings command:", error);
    await bot.sendMessage(
      chatId,
      "❌ Sorry, something went wrong loading your settings."
    );
  }
}

export async function handleStoreChange(
  bot: TelegramBot,
  callbackQueryId: string,
  userId: number,
  storeId: number
): Promise<void> {
  const tracker = createUserActionTracker(userId);

  try {
    const user = await getUserByTelegramId(userId);

    if (!user) {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "❌ User not found",
        show_alert: true,
      });
      return;
    }

    await bot.answerCallbackQuery(callbackQueryId, {
      text: `✅ Store changed`,
    });

    await updateUserStoreId(userId, storeId);

    const storeName =
      AVAILABLE_STORES.find((s) => s.id === storeId)?.name || "Unknown";

    const hasDeals = await hasActiveDealsForStore(storeId);

    if (!hasDeals) {
      await bot.sendMessage(
        userId,
        `🔄 Fetching latest deals for *${storeName}*...\n\nPlease check your deals in about 1 minute.`,
        { parse_mode: "Markdown" }
      );

      await runDailyParse({ manual: true, storeId });
    }

    await handleSettingsCommand(bot, userId);

    tracker.settingsChanged('store', user.storeId, storeId);
  } catch (error) {
    console.error("Error changing store:", error);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Failed to change store",
      show_alert: true,
    });
  }
}

export async function handleToggleNotifications(
  bot: TelegramBot,
  callbackQueryId: string,
  userId: number
): Promise<void> {
  const tracker = createUserActionTracker(userId);

  try {
    const user = await getUserByTelegramId(userId);

    if (!user) {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "❌ User not found",
        show_alert: true,
      });
      return;
    }

    const newStatus = !user.notificationsEnabled;

    await bot.answerCallbackQuery(callbackQueryId, {
      text: `Notifications ${newStatus ? "enabled" : "disabled"}`,
    });

    await updateUserNotifications(userId, newStatus);
    await handleSettingsCommand(bot, userId);

    tracker.settingsChanged('notifications', user.notificationsEnabled, newStatus);
  } catch (error) {
    console.error("Error toggling notifications:", error);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Failed to toggle notifications",
      show_alert: true,
    });
  }
}
