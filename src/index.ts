import { env } from "./config/env.js";
import { setupBotHandlers, registerCommands } from "./bot/index.js";
import { setupWebhook, isWebhookMode, bot } from "./config/telegram.js";
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
    } else if (req.url === "/webhook/telegram" && req.method === "POST" && isWebhookMode) {
      try {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const update = JSON.parse(body);
            bot.processUpdate(update);
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("OK");
          } catch (error) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("Bad Request");
          }
        });
      } catch (error) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request");
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

  if (isWebhookMode) {
    await setupWebhook();
  }

  setupBotHandlers();
  registerCommands();
  startHealthCheckServer();

  console.log("Bot initialized successfully!");
  console.log(`Bot mode: ${env.NODE_ENV === "production" ? "webhook" : "polling"}`);
  console.log(`Endpoints:`);
  console.log(`  - GET /health (for keep-alive - call every 14min)`);
  console.log(`  - GET /daily-parse (for daily deal refresh)`);
  if (isWebhookMode) {
    console.log(`  - POST /webhook/telegram (Telegram webhook)`);
  }
}

main().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});
