import TelegramBot from "node-telegram-bot-api";
import { env } from "./env.js";

export function createBot(): TelegramBot {
  return new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true });
}

export const bot = createBot();
