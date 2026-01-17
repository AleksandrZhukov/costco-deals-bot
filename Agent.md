# Agent Development Guidelines

## Project Overview
This is a Telegram bot for tracking deals from YEP Savings (Beacon Hill, Calgary location). The bot monitors deals, stores them in PostgreSQL, and allows users to interact through favorites and hiding unwanted items.

## Tech Stack
- **Runtime**: Node.js 24
- **Language**: TypeScript (latest, strict mode)
- **TypeScript Execution**: tsx
- **HTTP Client**: Axios
- **Bot Framework**: node-telegram-bot-api
- **Database**: PostgreSQL via Neon
- **ORM**: Drizzle ORM
- **Task Scheduling**: node-cron
- **Environment Validation**: @t3-oss/env-core
- **Schema Validation**: Zod
- **Containerization**: Docker

## Project Structure

```
deal-bot/
├── src/
│   ├── config/
│   │   ├── database.ts          # Neon DB connection
│   │   ├── telegram.ts          # Bot configuration
│   │   └── env.ts               # T3 Env validation schema
│   ├── services/
│   │   ├── yepApi/
│   │   │   ├── dealParser.ts    # Fetch and parse deals from YEP API
│   │   │   └── client.ts        # Axios client for YEP API
│   │   ├── dealComparator.ts    # Compare new deals with DB
│   │   └── notificationService.ts # Send Telegram notifications
│   ├── database/
│   │   ├── schema.ts            # Drizzle schema
│   │   ├── migrations/          # DB migrations
│   │   ├── migrate.ts           # Migration runner
│   │   └── queries.ts           # Database query functions
│   ├── bot/
│   │   ├── commands/
│   │   │   ├── start.ts
│   │   │   ├── deals.ts
│   │   │   ├── favorites.ts
│   │   │   └── settings.ts      # User settings (store selection, notifications)
│   │   ├── handlers/
│   │   │   └── callbackHandler.ts  # Handle inline button clicks
│   │   └── index.ts             # Bot initialization
│   ├── schedulers/
│   │   └── dailyParser.ts       # Cron job for daily parsing
│   ├── types/
│   │   ├── yepApi.ts            # TypeScript interfaces and Zod schemas for YEP API
│   │   └── index.ts             # Re-exports and common types
│   └── index.ts                 # Main entry point
├── .env.example
├── .env
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── deal_bot_plan.md             # Original project plan
├── work_plan.md                 # Work progress tracking
└── Agent.md                     # This file
```

## Development Rules

### 1. Code Quality Standards

#### TypeScript
- **Always use strict TypeScript**: All type checks enabled (see tsconfig.json)
- **No `any` types**: Use proper typing or `unknown` with type guards
- **No `@ts-ignore`**: Fix type errors, don't suppress them
- **Prefer explicit return types**: On all functions
- **Use Zod for runtime validation**: All external data (API responses, env vars)
- **Follow naming conventions**:
  - PascalCase for types, interfaces, classes
  - camelCase for variables, functions
  - SCREAMING_SNAKE_CASE for constants
  - Prefix interfaces with descriptive names (no "I" prefix)

#### File Organization
- **One primary export per file**: Makes imports clearer
- **Group imports**: External packages, internal modules, types
- **Barrel exports**: Use index.ts files for re-exporting
- **Co-locate related code**: Keep tests/types near implementation

#### Error Handling
- **Always handle errors**: Use try-catch for async operations
- **Log errors properly**: Include context and stack traces
- **Validate external data**: Use Zod schemas for all API responses
- **Never swallow errors silently**: At minimum, log them
- **Use proper error types**: Create custom error classes when needed

#### Database
- **Use Drizzle ORM**: Follow Drizzle patterns for queries
- **Type-safe queries**: Leverage Drizzle's TypeScript support
- **Index frequently queried fields**: See schema.ts for examples
- **Use transactions**: For operations that must be atomic
- **Validate before insert**: Use Zod schemas for data validation

#### API Integration
- **Validate all API responses**: Use Zod schemas (see yepApi.ts)
- **Handle rate limits**: Implement backoff strategies
- **Log API errors**: Include request details for debugging
- **Use typed Axios clients**: Configure with proper types

### 2. Development Workflow - PHASE-BY-PHASE APPROACH

**CRITICAL**: When working on implementation phases from deal_bot_plan.md, you MUST follow this workflow for EACH phase:

**IMPORTANT - ALWAYS COMMIT AFTER EACH PHASE!**
- You MUST create two commits for every phase:
  1. Implementation commit (after completing code changes)
  2. Work plan update commit (after updating work_done.md)
- Never skip committing - this is a mandatory step
- If you forget to commit, do it immediately before starting the next phase

#### Phase Workflow Steps

1. **START PHASE**
   - Read the phase requirements from deal_bot_plan.md
   - Break down the phase into specific implementation tasks
   - Identify which files need to be created or modified

2. **IMPLEMENT**
   - Create/modify files according to the phase requirements
   - Follow all code quality standards above
   - Add proper TypeScript types and Zod validation
   - Include error handling and logging
   - Add comments for complex logic

3. **RUN TYPE CHECKER**
   ```bash
   npm run typecheck
   ```
   - Fix ALL type errors before proceeding
   - No `any` types or `@ts-ignore` allowed
   - Ensure strict mode compliance

4. **RUN BUILD**
   ```bash
   npm run build
   ```
   - Fix ALL build errors
   - Ensure no compilation warnings
   - Verify output in dist/ directory

5. **TEST MANUALLY** (if applicable for current phase)
   - Run the application: `npm run dev`
   - Test the implemented functionality
   - Verify database operations work
   - Check API integrations
   - Test bot commands (if applicable)

6. **COMMIT CHANGES**
   ```bash
   git add .
   git commit -m "Phase X: Brief description of what was implemented"
   ```
   - Commit message should reference the phase number
   - Keep commits focused on the phase work
   - Include what was done, not how it was done

7. **UPDATE WORK PLAN**
   - Open `/Users/azhukov/projects/deal-bot/work_plan.md`
   - Add a new entry with:
     - Date and time
     - Phase number and name
     - Brief description of work completed (2-4 sentences)
     - Any issues encountered and how they were resolved
     - Next steps or dependencies
   - Use this format:
     ```markdown
     ## [YYYY-MM-DD HH:MM] Phase X: Phase Name
     
     **Completed:**
     - Brief description of what was implemented
     - Key files created/modified
     - Any important decisions made
     
     **Issues & Resolutions:**
     - Any problems encountered and solutions applied
     
     **Next Steps:**
     - What comes next or dependencies for next phase
     
     ---
     ```

8. **COMMIT WORK PLAN**
   ```bash
   git add work_plan.md
   git commit -m "Update work plan: Phase X completed"
   ```

9. **VERIFY**
   - Ensure both commits were successful
   - Check git log to confirm commits are recorded
   - Verify work_plan.md is up to date

#### Example Phase Workflow

```bash
# Phase 2 Example: Environment Configuration

# 1. Implement the phase
# - Create src/config/env.ts with T3 Env setup
# - Update .env.example with all required variables

# 2. Run type checker
npm run typecheck
# Fix any type errors

# 3. Run build
npm run build
# Ensure clean build

# 4. Test (if applicable)
npm run dev
# Verify env validation works

# 5. Commit implementation
git add src/config/env.ts .env.example
git commit -m "Phase 2: Add environment configuration with T3 Env validation"

# 6. Update work_plan.md
# Add entry describing Phase 2 completion

# 7. Commit work plan
git add work_plan.md
git commit -m "Update work plan: Phase 2 completed"

# 8. Move to next phase
```

### 3. Git Commit Guidelines

- **Commit after each phase**: Never skip committing after a phase
- **Two commits per phase**:
  1. Implementation commit
  2. Work plan update commit
- **Meaningful commit messages**: Use format "Phase X: Description"
- **Atomic commits**: Each phase is one logical unit of work
- **Keep work_plan.md updated**: It tracks the entire development journey

### 4. Testing Strategy

- **Manual testing required**: After each phase that adds functionality
- **Test edge cases**: Invalid inputs, missing data, API failures
- **Database testing**: Verify migrations, queries, and data integrity
- **Bot interaction testing**: Use real Telegram bot to test commands
- **API testing**: Test YEP API integration with different scenarios

### 5. Environment & Configuration

- **Never commit .env**: Only commit .env.example
- **Use T3 Env validation**: All env vars must be validated (see src/config/env.ts)
- **Document env vars**: Update .env.example with comments
- **Default values**: Provide sensible defaults where appropriate

### 6. Documentation

- **Update work_plan.md**: After EVERY phase (mandatory)
- **Comment complex logic**: Explain "why", not "what"
- **Document API contracts**: Include examples in comments
- **Keep README updated**: As features are added
- **Document database schema**: Include relationships and constraints

### 7. Dependencies

- **Check before adding**: Ensure package is necessary
- **Use specific versions**: Avoid ^ or ~ in package.json for production
- **Update package-lock.json**: Commit it with package.json changes
- **Review bundle size**: Keep dependencies minimal

## YEP Savings API Details

### Endpoint
```
GET https://yepsavings.com/api/customerPc/getProductList
```

### Parameters
- `userId=0`
- `storeId={user_store_id}` (e.g., 25 for Beacon Hill)
- `goodsType=0`
- `searchKey=` (empty)
- `pageNum=1`
- `pageSize=1000`

### Headers
```
Cookie: ezoictest=stable
```

### Response Validation
- **Always use Zod**: See `src/types/yepApi.ts` for schemas
- **Handle validation errors**: Log and gracefully fail
- **Check API response code**: Ensure `code === 200`

## Database Schema Summary

### Tables
1. **products**: Product master data (UPC, brand, name, image)
2. **deals**: Deal instances with pricing and timing
3. **users**: Telegram users with preferences
4. **user_deal_preferences**: User interactions (favorites, hidden)
5. **notification_log**: Notification history

### Key Relationships
- `deals.product_id` → `products.id`
- `user_deal_preferences.deal_id` → `deals.id`
- `notification_log.deal_id` → `deals.id`

## Bot Command Reference

- `/start` - Initialize bot and show welcome
- `/deals` - Show current active deals
- `/favorites` - Show favorited deals
- `/settings` - Configure store and notifications

## Common Tasks Reference

### Run Database Migration
```bash
npm run db:migrate
```

### Generate New Migration
```bash
npm run db:generate
```

### Type Check
```bash
npm run typecheck
```

### Build
```bash
npm run build
```

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Critical Reminders

1. **ALWAYS follow the phase-by-phase workflow**
2. **NEVER skip type checking and building**
3. **ALWAYS update work_plan.md after each phase**
4. **ALWAYS commit twice: implementation + work plan**
5. **NEVER use `any` type or suppress TypeScript errors**
6. **ALWAYS validate external data with Zod**
7. **ALWAYS handle errors properly with logging**
8. **NEVER commit .env file**
9. **ALWAYS test functionality before committing**
10. **KEEP commits focused and atomic**

## Resources

- **Plan**: See `deal_bot_plan.md` for complete implementation plan
- **Progress**: See `work_plan.md` for development history
- **Drizzle Docs**: https://orm.drizzle.team/docs/overview
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **T3 Env**: https://env.t3.gg/docs/introduction
- **Zod**: https://zod.dev/

---

**Remember**: Quality over speed. Each phase should be complete, tested, and committed before moving to the next. The work_plan.md is your development journal - keep it detailed and up-to-date.
