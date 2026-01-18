import type TelegramBot from "node-telegram-bot-api";
import { getUserByTelegramId } from "../../database/queries.js";
import { updateUserStoreId } from "../../database/queries.js";
import { updateUserNotifications } from "../../database/queries.js";

const AVAILABLE_STORES = [
  { id: 25, name: "Beacon Hill" },
  { id: 26, name: "Mckenzie Towne" },
  { id: 27, name: "Copperfield" },
  { id: 28, name: "Shawnessy" },
  { id: 29, name: "Airdrie" },
];

export async function handleSettingsCommand(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  try {
    const user = await getUserByTelegramId(chatId);

    if (!user) {
      await bot.sendMessage(
        chatId,
        "❌ User not found. Please use /start to initialize your account."
      );
      return;
    }

    const storeName =
      AVAILABLE_STORES.find((s) => s.id === user.storeId)?.name || "Unknown";
    const notifStatus = user.notificationsEnabled ? "✅ Enabled" : "❌ Disabled";

    const message = `
⚙️ **Current Settings**

🏪 **Store:** ${storeName} (ID: ${user.storeId})
🔔 **Notifications:** ${notifStatus}

Click the buttons below to change your settings:
`;

    const keyboard = {
      inline_keyboard: [
        AVAILABLE_STORES.map((store) => ({
          text: `🏪 ${store.name}`,
          callback_data: `set_store:${store.id}`,
        })),
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
  userId: number,
  storeId: number
): Promise<void> {
  try {
    await updateUserStoreId(userId, storeId);

    const storeName = AVAILABLE_STORES.find((s) => s.id === storeId)?.name || "Unknown";

    await bot.answerCallbackQuery(userId.toString(), {
      text: `✅ Store changed to ${storeName}`,
    });

    await handleSettingsCommand(bot, userId);
  } catch (error) {
    console.error("Error changing store:", error);
    await bot.answerCallbackQuery(userId.toString(), {
      text: "❌ Failed to change store",
      show_alert: true,
    });
  }
}

export async function handleToggleNotifications(
  bot: TelegramBot,
  userId: number
): Promise<void> {
  try {
    const user = await getUserByTelegramId(userId);

    if (!user) {
      await bot.answerCallbackQuery(userId.toString(), {
        text: "❌ User not found",
        show_alert: true,
      });
      return;
    }

    const newStatus = !user.notificationsEnabled;

    await updateUserNotifications(userId, newStatus);

    await bot.answerCallbackQuery(userId.toString(), {
      text: `Notifications ${newStatus ? "enabled" : "disabled"}`,
    });

    await handleSettingsCommand(bot, userId);
  } catch (error) {
    console.error("Error toggling notifications:", error);
    await bot.answerCallbackQuery(userId.toString(), {
      text: "❌ Failed to toggle notifications",
      show_alert: true,
    });
  }
}
