import type TelegramBot from "node-telegram-bot-api";
import { getUserByTelegramId, getUserDealTypePreferences, updateUserDealTypePreferences, clearUserDealTypePreferences } from "../../database/queries.js";
import { createUserActionTracker } from "../../utils/logger.js";
import { DEAL_TYPES } from "../../types/index.js";

export async function handleTypesCommand(
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
      tracker.command('types', {
        user_found: false,
      });
      return;
    }

    await sendTypeSelectorMessage(bot, chatId);

    tracker.command('types', {
      user_found: true,
    });
  } catch (error) {
    console.error("Error in /types command:", error);
    await bot.sendMessage(
      chatId,
      "❌ Sorry, something went wrong loading deal types."
    );
  }
}

export async function sendTypeSelectorMessage(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  try {
    const selectedTypeIds = await getUserDealTypePreferences(chatId);
    
    const hasPreferences = selectedTypeIds.length > 0;
    const currentSelectionText = hasPreferences
      ? selectedTypeIds.map(id => {
          const type = DEAL_TYPES.find(t => t.id === id);
          return type ? `${type.emoji} ${type.name}` : null;
        }).filter(Boolean).join(", ")
      : "All types (default)";

    const message = `🎯 **Deal Type Filter**

Select which deal types you want to see:

**Current selection:** ${currentSelectionText}

Click to toggle types on/off. When no types are selected, all types will be shown.`;

    const keyboard = buildTypeKeyboard(selectedTypeIds);

    await bot.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error sending type selector:", error);
    await bot.sendMessage(
      chatId,
      "❌ Sorry, something went wrong."
    );
  }
}

function buildTypeKeyboard(selectedTypeIds: number[]): TelegramBot.InlineKeyboardMarkup {
  const typeButtons = DEAL_TYPES.map(type => {
    const isSelected = selectedTypeIds.includes(type.id);
    const checkbox = isSelected ? "✅" : "⬜";
    return [{
      text: `${checkbox} ${type.emoji} ${type.name}`,
      callback_data: `toggle_type:${type.id}`,
    }];
  });

  const actionButtons = [
    {
      text: "🔄 Select All",
      callback_data: "select_all_types",
    },
    {
      text: "🗑️ Clear All",
      callback_data: "clear_all_types",
    },
  ];

  const navigationButtons = [
    {
      text: "⚙️ Back to Settings",
      callback_data: "back_to_settings",
    },
  ];

  return {
    inline_keyboard: [
      ...typeButtons,
      actionButtons,
      navigationButtons,
    ],
  };
}

export async function handleToggleType(
  bot: TelegramBot,
  callbackQueryId: string,
  userId: number,
  typeId: number,
  message?: TelegramBot.Message
): Promise<void> {
  const tracker = createUserActionTracker(userId);

  try {
    const currentTypeIds = await getUserDealTypePreferences(userId);
    
    // Toggle the type
    const newTypeIds = currentTypeIds.includes(typeId)
      ? currentTypeIds.filter(id => id !== typeId)
      : [...currentTypeIds, typeId];

    await updateUserDealTypePreferences(userId, newTypeIds);

    const type = DEAL_TYPES.find(t => t.id === typeId);
    const action = currentTypeIds.includes(typeId) ? "removed" : "added";

    await bot.answerCallbackQuery(callbackQueryId, {
      text: `${type?.emoji} ${type?.name} ${action}`,
    });

    // Update the message with new keyboard
    if (message) {
      const selectedTypeIds = await getUserDealTypePreferences(userId);
      const hasPreferences = selectedTypeIds.length > 0;
      const currentSelectionText = hasPreferences
        ? selectedTypeIds.map(id => {
            const t = DEAL_TYPES.find(dt => dt.id === id);
            return t ? `${t.emoji} ${t.name}` : null;
          }).filter(Boolean).join(", ")
        : "All types (default)";

      const updatedMessage = `🎯 **Deal Type Filter**

Select which deal types you want to see:

**Current selection:** ${currentSelectionText}

Click to toggle types on/off. When no types are selected, all types will be shown.`;

      const keyboard = buildTypeKeyboard(selectedTypeIds);

      await bot.editMessageText(updatedMessage, {
        chat_id: message.chat.id,
        message_id: message.message_id,
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    }

    tracker.callback('toggle_type', {
      type_id: String(typeId),
      action,
    });
  } catch (error) {
    console.error("Error toggling type:", error);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Failed to update type preference",
      show_alert: true,
    });
  }
}

export async function handleSelectAllTypes(
  bot: TelegramBot,
  callbackQueryId: string,
  userId: number,
  message?: TelegramBot.Message
): Promise<void> {
  const tracker = createUserActionTracker(userId);

  try {
    // Clear preferences to show all types (default behavior)
    await clearUserDealTypePreferences(userId);

    await bot.answerCallbackQuery(callbackQueryId, {
      text: "✅ All types selected (default)",
    });

    // Update the message
    if (message) {
      const updatedMessage = `🎯 **Deal Type Filter**

Select which deal types you want to see:

**Current selection:** All types (default)

Click to toggle types on/off. When no types are selected, all types will be shown.`;

      const keyboard = buildTypeKeyboard([]);

      await bot.editMessageText(updatedMessage, {
        chat_id: message.chat.id,
        message_id: message.message_id,
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    }

    tracker.callback('select_all_types', {});
  } catch (error) {
    console.error("Error selecting all types:", error);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Failed to select all types",
      show_alert: true,
    });
  }
}

export async function handleClearAllTypes(
  bot: TelegramBot,
  callbackQueryId: string,
  userId: number,
  message?: TelegramBot.Message
): Promise<void> {
  const tracker = createUserActionTracker(userId);

  try {
    // Set empty array to show no deals
    await updateUserDealTypePreferences(userId, []);

    await bot.answerCallbackQuery(callbackQueryId, {
      text: "🗑️ All types cleared - no deals will be shown",
    });

    // Update the message
    if (message) {
      const updatedMessage = `🎯 **Deal Type Filter**

Select which deal types you want to see:

**Current selection:** None (no deals will be shown)

Click to toggle types on/off. When no types are selected, all types will be shown.`;

      const keyboard = buildTypeKeyboard([]);

      await bot.editMessageText(updatedMessage, {
        chat_id: message.chat.id,
        message_id: message.message_id,
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    }

    tracker.callback('clear_all_types', {});
  } catch (error) {
    console.error("Error clearing all types:", error);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "❌ Failed to clear all types",
      show_alert: true,
    });
  }
}
