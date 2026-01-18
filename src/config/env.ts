import 'dotenv/config'
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";


export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.string().url(),

    // Telegram Bot
    TELEGRAM_BOT_TOKEN: z.string().min(1),

    // YEP Savings API
    YEP_API_BASE_URL: z.string().url().default("https://yepsavings.com"),
    YEP_API_COOKIE: z.string().default("ezoictest=stable"),

    // Node Environment
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
