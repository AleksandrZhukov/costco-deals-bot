import 'dotenv/config'
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";


export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.url(),

    // Telegram Bot
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    WEBHOOK_URL: z.url(),

    // YEP Savings API
    YEP_API_BASE_URL: z.url(),
    YEP_API_COOKIE: z.string(),

    // Node Environment
    NODE_ENV: z.enum(["development", "production", "test"]),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
