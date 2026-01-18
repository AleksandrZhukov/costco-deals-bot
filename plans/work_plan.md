# YEP Savings Deal Bot - Work Plan

This document breaks down the implementation into smaller phases with specific tasks.

---

## Phase 1: Project Setup & Foundation

**Goal:** Initialize the project structure with all necessary configurations.

### Tasks:
- [ ] 1.1 Initialize npm project and create directory structure
- [ ] 1.2 Install core dependencies (axios, node-telegram-bot-api, node-cron, zod, @t3-oss/env-core)
- [ ] 1.3 Install TypeScript and type definitions
- [ ] 1.4 Install Drizzle ORM and postgres driver
- [ ] 1.5 Create `tsconfig.json` with proper configuration
- [ ] 1.6 Create `package.json` scripts (dev, start, build, typecheck, db:*)
- [ ] 1.7 Create `.env.example` with all required environment variables
- [ ] 1.8 Create `src/config/env.ts` with T3 Env validation schema
- [ ] 1.9 Create basic `src/index.ts` entry point

### Deliverables:
- Working TypeScript project that compiles
- Environment validation working
- All dependencies installed

---

## Phase 2: Type Definitions & API Schemas

**Goal:** Define all TypeScript types and Zod validation schemas for the YEP API.

### Tasks:
- [ ] 2.1 Create `src/types/yepApi.ts` with Zod schemas:
  - [ ] `YepDealItemSchema` for deal items
  - [ ] `YepGoodsTypeSchema` for goods types
  - [ ] `YepApiResponseSchema` for full API response
- [ ] 2.2 Export inferred TypeScript types from Zod schemas
- [ ] 2.3 Create helper functions for safe parsing (`parseYepApiResponse`, `safeParseYepApiResponse`)
- [ ] 2.4 Create `src/types/index.ts` barrel export

### Deliverables:
- Complete type definitions for YEP API
- Validation schemas ready for use

---

## Phase 3: Database Layer

**Goal:** Set up PostgreSQL connection and ORM layer.

### Tasks:
- [ ] 3.1 Create Neon PostgreSQL database account and project
- [ ] 3.2 Create `src/config/database.ts` with Drizzle connection setup
- [ ] 3.3 Create `src/database/schema.ts` with Drizzle schema:
  - [ ] `products` table
  - [ ] `deals` table
  - [ ] `users` table
  - [ ] `user_deal_preferences` table
  - [ ] `notification_log` table
- [ ] 3.4 Create `drizzle.config.ts` configuration file
- [ ] 3.5 Create `src/database/migrate.ts` migration runner
- [ ] 3.6 Generate and run initial migration
- [ ] 3.7 Create `src/database/queries.ts` with query functions:
  - [ ] User CRUD operations
  - [ ] Product CRUD operations
  - [ ] Deal CRUD operations
  - [ ] User preferences operations
  - [ ] Notification log operations

### Deliverables:
- Database tables created in Neon
- All CRUD operations functional
- Migrations working

---

## Phase 4: YEP API Client

**Goal:** Implement the API client to fetch deals from YEP Savings.

### Tasks:
- [ ] 4.1 Create `src/services/yepApi/client.ts` with Axios instance
  - [ ] Configure base URL from env
  - [ ] Set required headers (Cookie: ezoictest=stable)
- [ ] 4.2 Create `src/services/yepApi/dealParser.ts`:
  - [ ] `fetchDealsForStore(storeId)` function
  - [ ] Implement Zod validation on response
  - [ ] Error handling for API failures
- [ ] 4.3 Create `src/services/yepApi/index.ts` barrel export
- [ ] 4.4 Write manual test to verify API connection works

### Deliverables:
- Working API client that fetches and validates deals
- Error handling in place

---

## Phase 5: Deal Processing Service

**Goal:** Implement logic to compare, store, and update deals.

### Tasks:
- [ ] 5.1 Create `src/services/dealProcessor.ts`:
  - [ ] `processDealsFromApi(deals, storeId)` main function
  - [ ] Product upsert logic (create or update by UPC)
  - [ ] Deal upsert logic (create or update by deal_id)
  - [ ] Update product frequency counter
- [ ] 5.2 Create `src/services/dealComparator.ts`:
  - [ ] `findNewDeals(apiDeals, existingDeals)` function
  - [ ] Compare by deal_id and is_latest flag
  - [ ] Return list of new deals for notification
- [ ] 5.3 Implement deal expiration logic:
  - [ ] Mark deals as inactive when end_time has passed
  - [ ] Update is_active flag during processing

### Deliverables:
- Deal processing pipeline working
- New deal detection functional
- Products and deals stored correctly

---

## Phase 6: Telegram Bot Core

**Goal:** Set up the Telegram bot with basic commands.

### Tasks:
- [ ] 6.1 Create `src/config/telegram.ts` with bot configuration
- [ ] 6.2 Create `src/bot/index.ts` with bot initialization
- [ ] 6.3 Create `src/bot/commands/start.ts`:
  - [ ] Welcome message
  - [ ] Create user in database if new
  - [ ] Show available commands
- [ ] 6.4 Create `src/bot/handlers/callbackHandler.ts`:
  - [ ] Parse callback data format (action:dealId)
  - [ ] Route to appropriate handler
- [ ] 6.5 Register commands with BotFather via setMyCommands
- [ ] 6.6 Test bot responds to /start

### Deliverables:
- Bot responding to /start command
- User created in database on first interaction
- Callback infrastructure ready

---

## Phase 7: Notification Service

**Goal:** Implement deal notification system.

### Tasks:
- [ ] 7.1 Create `src/services/notificationService.ts`:
  - [ ] `sendDealNotification(userId, deal)` function
  - [ ] Format message with product details (brand, name, prices)
  - [ ] Attach product image
  - [ ] Create inline keyboard (Favorite, Hide buttons)
- [ ] 7.2 Implement notification logging:
  - [ ] Log sent notifications to notification_log table
  - [ ] Track success/failure status
- [ ] 7.3 Create `src/utils/formatters.ts`:
  - [ ] `formatDealMessage(deal, product)` function
  - [ ] `formatPrice(price)` helper
  - [ ] `calculateDiscount(sourcePrice, currentPrice)` helper
- [ ] 7.4 Implement batch notification for multiple users:
  - [ ] Query eligible users (notifications enabled, deal not hidden)
  - [ ] Rate limiting to avoid Telegram API limits

### Deliverables:
- Notifications sent to users for new deals
- Messages formatted with images and buttons
- Logging in place

---

## Phase 8: Scheduled Parsing

**Goal:** Set up automated daily deal parsing.

### Tasks:
- [ ] 8.1 Create `src/schedulers/dailyParser.ts`:
  - [ ] Configure node-cron with schedule from env
  - [ ] Handle timezone (America/Edmonton)
- [ ] 8.2 Implement daily parse job:
  - [ ] Fetch all unique store_ids from users
  - [ ] For each store, fetch deals from API
  - [ ] Process and store deals
  - [ ] Identify new deals
  - [ ] Send notifications
- [ ] 8.3 Add manual trigger option for testing
- [ ] 8.4 Implement error recovery:
  - [ ] Retry logic for failed API calls
  - [ ] Continue with next store if one fails
  - [ ] Log all errors

### Deliverables:
- Cron job running on schedule
- Full pipeline: fetch -> process -> notify
- Error handling and logging

---

## Phase 9: User Commands

**Goal:** Implement remaining bot commands.

### Tasks:
- [ ] 9.1 Create `src/bot/commands/deals.ts`:
  - [ ] Fetch active deals for user's store
  - [ ] Exclude hidden deals
  - [ ] Paginate if many deals
  - [ ] Display with inline buttons
- [ ] 9.2 Create `src/bot/commands/favorites.ts`:
  - [ ] Fetch user's favorited deals
  - [ ] Show only active favorites
  - [ ] Allow unfavorite action
- [ ] 9.3 Create `src/bot/commands/settings.ts`:
  - [ ] Show current settings (store, notifications)
  - [ ] Inline keyboard for store selection
  - [ ] Toggle notifications on/off
- [ ] 9.4 Implement inline button handlers:
  - [ ] Favorite button: toggle is_favorite in user_deal_preferences
  - [ ] Hide button: set is_hidden, optionally remove message
  - [ ] Update button states after action

### Deliverables:
- All commands functional
- User preferences working
- Interactive buttons responding

---

## Phase 10: Docker & Deployment

**Goal:** Containerize and prepare for deployment.

### Tasks:
- [ ] 10.1 Create `Dockerfile`:
  - [ ] Use node:24-alpine base
  - [ ] Install dependencies
  - [ ] Set up non-root user
  - [ ] Configure health check endpoint
- [ ] 10.2 Create `docker-compose.yml`:
  - [ ] Configure service with environment variables
  - [ ] Set up volume for logs
  - [ ] Configure restart policy
  - [ ] Add health check
- [ ] 10.3 Create `.dockerignore` file
- [ ] 10.4 Add simple health check endpoint in app:
  - [ ] HTTP endpoint on port 3000
  - [ ] Return OK if bot is connected
- [ ] 10.5 Test local Docker build and run
- [ ] 10.6 Create deployment documentation

### Deliverables:
- Docker image builds successfully
- Container runs with docker-compose
- Health checks passing

---

## Phase 11: Production Hardening

**Goal:** Add production-ready features.

### Tasks:
- [ ] 11.1 Add structured logging:
  - [ ] Install pino or winston
  - [ ] Configure log levels
  - [ ] Add request/response logging for API calls
- [ ] 11.2 Implement graceful shutdown:
  - [ ] Handle SIGTERM/SIGINT signals
  - [ ] Close database connections
  - [ ] Stop cron jobs cleanly
- [ ] 11.3 Add retry logic:
  - [ ] Install axios-retry
  - [ ] Configure retry for API calls
  - [ ] Exponential backoff for Telegram API
- [ ] 11.4 Input validation:
  - [ ] Validate all user inputs
  - [ ] Sanitize callback data
- [ ] 11.5 Rate limiting:
  - [ ] Implement command rate limiting per user
  - [ ] Respect Telegram API rate limits

### Deliverables:
- Production-quality error handling
- Proper logging
- Graceful startup/shutdown

---

## Phase 12: Testing & Documentation

**Goal:** Add tests and documentation.

### Tasks:
- [ ] 12.1 Set up testing framework (vitest or jest)
- [ ] 12.2 Write unit tests:
  - [ ] Zod schema validation tests
  - [ ] Deal comparator tests
  - [ ] Price formatter tests
- [ ] 12.3 Write integration tests:
  - [ ] Database query tests
  - [ ] API client tests (with mocks)
- [ ] 12.4 Create README.md:
  - [ ] Project overview
  - [ ] Setup instructions
  - [ ] Command reference
  - [ ] Deployment guide
- [ ] 12.5 Document environment variables
- [ ] 12.6 Add inline code documentation

### Deliverables:
- Test suite with good coverage
- Complete documentation
- Ready for handoff/maintenance

---

## Summary Timeline

| Phase | Description | Estimated Effort |
|-------|-------------|------------------|
| 1 | Project Setup | 1-2 hours |
| 2 | Type Definitions | 1 hour |
| 3 | Database Layer | 2-3 hours |
| 4 | YEP API Client | 1-2 hours |
| 5 | Deal Processing | 2-3 hours |
| 6 | Bot Core | 2 hours |
| 7 | Notifications | 2-3 hours |
| 8 | Scheduled Parsing | 2 hours |
| 9 | User Commands | 3-4 hours |
| 10 | Docker & Deployment | 2 hours |
| 11 | Production Hardening | 2-3 hours |
| 12 | Testing & Docs | 3-4 hours |

**Total Estimated Effort: 23-33 hours**

---

## Quick Start Order

For fastest path to a working prototype:

1. Phase 1 (Setup)
2. Phase 2 (Types)
3. Phase 4 (API Client) - test API works
4. Phase 3 (Database)
5. Phase 6 (Bot Core) - test bot works
6. Phase 5 (Deal Processing)
7. Phase 7 (Notifications)
8. Phase 8 (Scheduler)
9. Phase 9 (Commands)
10. Phase 10-12 (Polish)
