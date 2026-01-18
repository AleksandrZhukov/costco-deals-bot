import { env } from "./config/env.js";
import { setupBotHandlers, registerCommands } from "./bot/index.js";
import { startScheduler } from "./schedulers/dailyParser.js";
import { createServer } from "http";

const HEALTH_CHECK_PORT = 3000;

function startHealthCheckServer(): void {
  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  });

  server.listen(HEALTH_CHECK_PORT, () => {
    console.log(`✅ Health check server listening on port ${HEALTH_CHECK_PORT}`);
  });
}

async function main() {
  console.log("YEP Savings Deal Bot starting...");
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Timezone: ${env.TIMEZONE}`);
  console.log(`Daily parse schedule: ${env.DAILY_PARSE_SCHEDULE}`);

  setupBotHandlers();
  registerCommands();
  startScheduler();
  startHealthCheckServer();

  console.log("Bot initialized successfully!");
}

main().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});
