import { env } from "./config/env.js";
import { setupBotHandlers, registerCommands } from "./bot/index.js";
import { runDailyParse } from "./schedulers/dailyParser.js";
import { createServer } from "http";

const HEALTH_CHECK_PORT = 3000;

function startHealthCheckServer(): void {
  const server = createServer(async (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    } else if (req.url === "/daily-parse") {
      res.writeHead(200, { "Content-Type": "application/json" });
      try {
        await runDailyParse({ manual: true });
        res.end(JSON.stringify({ status: "success", message: "Daily parse completed" }));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "error", message: error instanceof Error ? error.message : "Unknown error" }));
      }
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

  setupBotHandlers();
  registerCommands();
  startHealthCheckServer();

  console.log("Bot initialized successfully!");
  console.log(`Endpoints:`);
  console.log(`  - GET /health (for keep-alive - call every 14min)`);
  console.log(`  - GET /daily-parse (for daily deal refresh)`);
}

main().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});
