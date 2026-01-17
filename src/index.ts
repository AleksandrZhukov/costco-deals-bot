import { env } from "./config/env.js";
import { setupBotHandlers, registerCommands } from "./bot/index.js";

async function main() {
  console.log("YEP Savings Deal Bot starting...");
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Timezone: ${env.TIMEZONE}`);
  console.log(`Daily parse schedule: ${env.DAILY_PARSE_SCHEDULE}`);

  setupBotHandlers();
  registerCommands();

  console.log("Bot initialized successfully!");
}

main().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});
