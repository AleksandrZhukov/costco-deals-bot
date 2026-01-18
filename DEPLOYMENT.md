# YEP Savings Deal Bot - Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (Neon or self-hosted)
- Telegram Bot Token from BotFather
- Environment variables configured

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here

# YEP Savings API
YEP_API_BASE_URL=https://www.yepsavings.com
YEP_API_COOKIE=ezoictest=stable

# Scheduling
DAILY_PARSE_SCHEDULE=0 9 * * *
TIMEZONE=America/Edmonton

# Node Environment
NODE_ENV=production
```

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
