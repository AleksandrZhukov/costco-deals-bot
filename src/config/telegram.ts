import TelegramBot from "node-telegram-bot-api";
import { env } from "./env.js";

const isProduction = env.NODE_ENV === "production";

export function createBot(): TelegramBot {
  return new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: !isProduction });
}

export async function setupWebhook(): Promise<void> {
  if (env.NODE_ENV !== "production") return;

  const webhookUrl = `${env.WEBHOOK_URL}/webhook/telegram`;
  await bot.setWebHook(webhookUrl);
  console.log(`✅ Webhook set to: ${webhookUrl}`);
}

export const bot = createBot();
export const isWebhookMode = env.NODE_ENV === "production";
