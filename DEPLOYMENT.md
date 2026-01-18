# YEP Savings Deal Bot - Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (Neon or self-hosted)
- Telegram Bot Token from BotFather
- Axiom account for logging
- Environment variables configured

## Environment Variables

Create a `.env` file in project root with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here

# YEP Savings API
YEP_API_BASE_URL=https://www.yepsavings.com
YEP_API_COOKIE=ezoictest=stable

# Axiom Logging
AXIOM_TOKEN=your_axiom_api_token_here
AXIOM_DATASET=costco-deals-bot
LOG_LEVEL=info

# Scheduling
DAILY_PARSE_SCHEDULE=0 9 * * *
TIMEZONE=America/Edmonton

# Node Environment
NODE_ENV=production
```

### Environment Variable Details

| Variable | Required | Description | Example |
|----------|-----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather | `123456789:ABCdefGHI...` |
| `YEP_API_BASE_URL` | Yes | YEP Savings API endpoint | `https://www.yepsavings.com` |
| `YEP_API_COOKIE` | Yes | Cookie for API authentication | `ezoictest=stable` |
| `AXIOM_TOKEN` | Yes | Axiom API token for logging | `xaat-xxx...` |
| `AXIOM_DATASET` | No | Axiom dataset name (default: costco-deals-bot) | `costco-deals-bot` |
| `LOG_LEVEL` | No | Logging verbosity (debug, info, warn, error) | `info` |
| `WEBHOOK_URL` | No | Telegram webhook URL (production only) | `https://your-bot.onrender.com` |
| `NODE_ENV` | No | Environment mode | `development` or `production` |

## Axiom Logging Setup

Axiom provides centralized log management for the bot. Follow these steps to set it up:

### 1. Create Axiom Account

1. Go to https://axiom.co
2. Sign up for a free account (no credit card required)
3. Free tier includes 500MB/day of log ingestion

### 2. Create Dataset

1. After logging in, you'll be prompted to ingest data
2. Choose "Don't have data? Create a dataset"
3. Enter dataset name: `costco-deals-bot`
4. Click "Create dataset"

### 3. Generate API Token

1. Navigate to **Settings** → **API Tokens** (left sidebar)
2. Click **+ New Token**
3. Configure the token:
   - **Name**: `yep-savings-bot`
   - **Permissions**: Check "Ingest" and "Query"
   - **Scopes**: Leave empty (applies to all datasets)
4. Click **Create Token**
5. **Important**: Copy the token immediately (you won't see it again)
6. Format: `xaat-xxxx...` (save this to `.env` as `AXIOM_TOKEN`)

### 4. Configure Environment Variables

Add these to your `.env` file:

```bash
# Axiom Logging
AXIOM_TOKEN=xaat-your-token-here
AXIOM_DATASET=costco-deals-bot
LOG_LEVEL=info
```

**Log Levels**:
- `debug`: All logs including health checks and detailed operations
- `info` (default): Normal operations, errors, and warnings
- `warn`: Only warnings and errors
- `error`: Only errors

### 5. Verify Logging

Start the bot locally to verify logs are flowing:

```bash
# Ensure .env is configured
npm run dev

# Trigger some actions:
# - Send /start to your bot
# - Send /deals to see deal listings
# - Send /settings to change preferences
```

Check logs in Axiom:

1. Go to https://axiom.co
2. Click on `costco-deals-bot` dataset
3. You should see events like:
   - `app.startup`
   - `user.command`
   - `yep.api.success`
   - `deal.processed`

### 6. Configure Dataset Settings

Navigate to your dataset → **Settings**:

- **Retention**: Set to **7 days hot, 30 days warm**
- **Field Types**: Axiom auto-detects, but you can manually configure if needed
  - `event_type`: string
  - `user_id`: number
  - `store_id`: number
  - `deal_id`: string
  - `success`: boolean

### 7. Create Dashboards and Alerts

See [docs/AXIOM_SETUP.md](./docs/AXIOM_SETUP.md) for comprehensive setup guide.

**Quick Summary**:
- Pre-configured dashboard definitions: `docs/axiom/*.json`
- Alert configurations: `docs/axiom/alerts/*.json`
- Set up notification channels (email, Slack) for alerts

**Dashboards Included**:
1. **Operations Dashboard** - Real-time system health (refresh: 1m)
2. **Business Metrics Dashboard** - KPIs and engagement (refresh: 5m)
3. **Performance Dashboard** - Latency and bottlenecks (refresh: 2m)

**Alerts Included**:
1. **High Error Rate Alert** - >10 errors in 5 minutes
2. **API Latency Alert** - >5 slow requests (>1s) in 5 minutes
3. **Job Failure Alert** - Any job failure
4. **Notification Failure Rate Alert** - >50% failed in 10 minutes
5. **API Failure Rate Alert** - >10% failures in 1 minute

### 8. Set Up Alert Notification Channels

Configure where alerts are sent:

1. **Email Notifications**:
   - Go to **Settings** → **Notification Channels**
   - Add **Email** channel
   - Add team email addresses

2. **Slack Notifications** (optional):
   - Create Slack incoming webhook
   - Add **Slack** channel in Axiom
   - Paste webhook URL

### Troubleshooting Axiom Setup

**Logs not appearing**:
1. Verify `AXIOM_TOKEN` is correct (starts with `xaat-`)
2. Check dataset name matches `AXIOM_DATASET`
3. Verify log level: `LOG_LEVEL` (set to `debug` to see all logs)
4. Check network connectivity to Axiom

**Authentication errors**:
1. Ensure token has "Ingest" permission
2. Verify token hasn't been revoked
3. Regenerate token if needed

**Too many logs**:
1. Increase log level: `LOG_LEVEL=warn` or `LOG_LEVEL=error`
2. Disable debug logs in production

For more logging details, see [docs/LOGGING.md](./docs/LOGGING.md).

## Quick Start

### Using Docker Compose (Recommended)

1. Build and start the container:
   ```bash
   docker-compose up -d
   ```

2. View logs:
   ```bash
   docker-compose logs -f
   ```

3. Stop the container:
   ```bash
   docker-compose down
   ```

### Using Docker

1. Build the image:
   ```bash
   docker build -t deal-bot .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name deal-bot \
     --env-file .env \
     -p 3000:3000 \
     deal-bot
   ```

3. View logs:
   ```bash
   docker logs -f deal-bot
   ```

4. Stop the container:
   ```bash
   docker stop deal-bot
   docker rm deal-bot
   ```

## Health Check

The bot exposes a health check endpoint at `http://localhost:3000/health`:

- Returns `200 OK` if the bot is running
- Returns `404 Not Found` for other endpoints
- Docker automatically checks this every 30 seconds

## Logs

Logs are stored in the `./logs` directory when using Docker Compose.
Docker automatically rotates logs (max 10MB per file, keeping 3 files).

To view container logs:
```bash
docker-compose logs -f deal-bot
```

## Database Setup

### Using Neon (Recommended)

1. Create a project at https://neon.tech
2. Get the connection string from the Dashboard
3. Update `DATABASE_URL` in your `.env` file

### Run Migrations

```bash
npm run db:migrate
```

## Bot Setup

1. Create a bot through BotFather on Telegram
2. Get the bot token
3. Add the token to `TELEGRAM_BOT_TOKEN` in `.env`
4. Start the bot - it will automatically register commands with Telegram

## Schedules

The bot runs a daily parse job according to the `DAILY_PARSE_SCHEDULE` environment variable.

Default: `0 9 * * *` (9:00 AM daily, in the configured timezone)

To change the schedule, update the environment variable with a valid cron expression.

## Troubleshooting

### Bot Not Responding

Check that:
1. `TELEGRAM_BOT_TOKEN` is correct
2. Bot is allowed to receive messages (privacy mode disabled)
3. Container is running: `docker-compose ps`

### Database Connection Errors

Check that:
1. `DATABASE_URL` is correct
2. Database is accessible from the container
3. Migrations have been run: `npm run db:migrate`

### Health Check Failing

Check that:
1. Container is running: `docker-compose ps`
2. Logs show no errors: `docker-compose logs`
3. Health check endpoint is accessible: `curl http://localhost:3000/health`

### Build Fails

Check that:
1. Docker daemon is running
2. All dependencies are in `package.json`
3. Node.js version is compatible (uses node:24-alpine)

## Production Considerations

### Security

- Never commit `.env` file to version control
- Use strong database passwords
- Rotate bot tokens regularly
- Keep dependencies up to date

### Monitoring

- Monitor container health status
- Check logs for errors regularly
- Set up alerts for failed health checks
- Monitor database connection pool

### Scaling

- For high traffic, consider running multiple instances behind a load balancer
- Use environment variable `TELEGRAM_WEBHOOK_URL` to use webhooks instead of polling
- Increase database connection pool size

### Backups

- Regularly backup PostgreSQL database
- Backup `.env` file securely
- Keep database migrations in version control

## Updating the Bot

1. Stop the container:
   ```bash
   docker-compose down
   ```

2. Pull latest changes:
   ```bash
   git pull
   ```

3. Rebuild and start:
   ```bash
   docker-compose up -d --build
   ```

4. Run any new migrations:
   ```bash
   docker-compose exec deal-bot npm run db:migrate
   ```
