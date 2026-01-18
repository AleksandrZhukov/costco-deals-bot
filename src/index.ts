import { env } from "./config/env.js";
import { setupBotHandlers, registerCommands } from "./bot/index.js";
import { setupWebhook, isWebhookMode, bot } from "./config/telegram.js";
import { runDailyParse } from "./schedulers/dailyParser.js";
import { createServer } from "http";
import { log, flushLogs } from "./utils/logger.js";
import { logError } from "./utils/errorLogger.js";
import { EventTypes } from "./utils/eventTypes.js";

const HEALTH_CHECK_PORT = 3000;

let isShuttingDown = false;

function startHealthCheckServer(): void {
  const server = createServer(async (req, res) => {
    if (req.url === "/health") {
      if (isShuttingDown) {
        res.writeHead(503, { "Content-Type": "text/plain" });
        res.end("Service Unavailable - Shutting Down");
        return;
      }
      log.debug(EventTypes.HEALTH_CHECK, { endpoint: "/health" });
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

  log.info(EventTypes.APP_STARTUP, {
    node_version: process.version,
    environment: env.NODE_ENV,
    webhook_mode: isWebhookMode,
    health_check_port: HEALTH_CHECK_PORT,
  });

  try {
    if (isWebhookMode) {
      await setupWebhook();
    }

    setupBotHandlers();
    registerCommands();
    startHealthCheckServer();

    log.info(EventTypes.APP_STARTUP, {
      services_initialized: true,
      bot_mode: env.NODE_ENV === "production" ? "webhook" : "polling",
      endpoints_available: [
        "/health",
        "/daily-parse",
        ...(isWebhookMode ? ["/webhook/telegram"] : []),
      ],
    });

    console.log("Bot initialized successfully!");
    console.log(`Bot mode: ${env.NODE_ENV === "production" ? "webhook" : "polling"}`);
    console.log(`Endpoints:`);
    console.log(`  - GET /health (for keep-alive - call every 14min)`);
    console.log(`  - GET /daily-parse (for daily deal refresh)`);
    if (isWebhookMode) {
      console.log(`  - POST /webhook/telegram (Telegram webhook)`);
    }
  } catch (error) {
    logError(error, { error_type: EventTypes.ERROR_UNHANDLED });
    console.error("Failed to start bot:", error);
    await flushLogs();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log("Shutdown already in progress, forcing exit...");
    process.exit(1);
  }

  isShuttingDown = true;
  console.log(`\n${signal} received, starting graceful shutdown...`);

  log.info(EventTypes.APP_SHUTDOWN, {
    signal,
  });

  try {
    await flushLogs();
    console.log("Logs flushed successfully");
  } catch (error) {
    console.error("Error flushing logs:", error);
  }

  console.log("Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    console.error("Error during SIGTERM shutdown:", error);
    process.exit(1);
  });
});

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    console.error("Error during SIGINT shutdown:", error);
    process.exit(1);
  });
});

process.on("uncaughtException", async (error) => {
  console.error("Uncaught Exception:", error);
  logError(error, { error_type: EventTypes.ERROR_UNHANDLED });
  await flushLogs();
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  console.error("Unhandled Rejection:", reason);
  logError(reason, { error_type: EventTypes.ERROR_UNHANDLED });
  await flushLogs();
  process.exit(1);
});
