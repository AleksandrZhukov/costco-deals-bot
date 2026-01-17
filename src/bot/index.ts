import { bot } from "../config/telegram.js";
import { handleStartCommand } from "./commands/start.js";
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

  bot.on("callback_query", async (query) => {
    const { id, data } = query;

    if (data) {
      await handleCallbackQuery(bot, id, data);
    }
  });

  bot.on("polling_error", (error) => {
    console.error("Polling error:", error);
  });

  console.log("✅ Bot handlers registered");
}

export function registerCommands(): void {
  bot
    .setMyCommands([
      { command: "start", description: "Show welcome message" },
      { command: "deals", description: "Show current active deals" },
      { command: "favorites", description: "Show your favorite deals" },
      { command: "settings", description: "Configure your preferences" },
    ])
    .then(() => {
      console.log("✅ Bot commands registered with Telegram");
    })
    .catch((error) => {
      console.error("Failed to register commands:", error);
    });
}
