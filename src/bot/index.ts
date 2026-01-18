import { bot, isWebhookMode } from "../config/telegram.js";
import { handleStartCommand } from "./commands/start.js";
import { handleDealsCommand } from "./commands/deals.js";
import { handleFavoritesCommand } from "./commands/favorites.js";
import { handleSettingsCommand } from "./commands/settings.js";
import { handleCartCommand } from "./commands/cart.js";
import { handleCallbackQuery } from "./handlers/callbackHandler.js";

export function setupBotHandlers(): void {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await handleStartCommand(
      bot,
      chatId,
      msg.from?.username,
      msg.from?.first_name
    );
  });

  bot.onText(/\/deals/, async (msg) => {
    const chatId = msg.chat.id;
    await handleDealsCommand(bot, chatId, 0);
  });

  bot.onText(/\/favorites/, async (msg) => {
    const chatId = msg.chat.id;
    await handleFavoritesCommand(bot, chatId);
  });

  bot.onText(/\/settings/, async (msg) => {
    const chatId = msg.chat.id;
    await handleSettingsCommand(bot, chatId);
  });

  bot.onText(/\/cart/, async (msg) => {
    const chatId = msg.chat.id;
    await handleCartCommand(bot, chatId);
  });

  bot.on("callback_query", async (query) => {
    const { id, data, from, message } = query;

    if (data) {
      await handleCallbackQuery(bot, id, data, from.id, message);
    }
  });

  if (!isWebhookMode) {
    bot.on("polling_error", (error) => {
      console.error("Polling error:", error);
    });
  }

  console.log("✅ Bot handlers registered");
}

export function registerCommands(): void {
  bot
    .setMyCommands([
      { command: "start", description: "Show welcome message" },
      { command: "deals", description: "Show current active deals" },
      { command: "favorites", description: "Show your favorite deals" },
      { command: "cart", description: "View your shopping cart" },
      { command: "settings", description: "Configure your preferences" },
    ])
    .then(() => {
      console.log("✅ Bot commands registered with Telegram");
    })
    .catch((error) => {
      console.error("Failed to register commands:", error);
    });
}
