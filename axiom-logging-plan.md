# Axiom Logging Implementation Plan

## Overview
Implement structured logging using `@axiomhq/logging` with the Wide Events (Canonical Log Line) approach from [loggingsucks.com](https://loggingsucks.com/).

**Key Principle**: One rich, wide event per logical operation containing all relevant context.

---

## Phase 1: Setup & Configuration

### Tasks

#### 1.1 Install Dependencies
```bash
npm install @axiomhq/logging
```

#### 1.2 Update Environment Configuration
**File**: `src/config/env.ts`

Add new environment variables:
```typescript
AXIOM_TOKEN: z.string().min(1),
AXIOM_DATASET: z.string().default('costco-deals-bot'),
LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
NODE_ENV: z.enum(['development', 'production']).default('development'),
```

#### 1.3 Create Axiom Logger Config
**File**: `src/config/axiom.ts`

```typescript
import { Logger } from '@axiomhq/logging';
import { env } from './env.js';

export const logger = new Logger({
  token: env.AXIOM_TOKEN,
  dataset: env.AXIOM_DATASET,
  logLevel: env.LOG_LEVEL,
});

// Graceful shutdown helper
export async function flushLogs(): Promise<void> {
  await logger.flush();
}
```

#### 1.4 Update `.env.example`
Add:
```bash
# Axiom Logging
AXIOM_TOKEN=your_axiom_api_token_here
AXIOM_DATASET=costco-deals-bot
LOG_LEVEL=info
```

**Deliverables**:
- ✅ `@axiomhq/logging` installed
- ✅ Environment variables configured
- ✅ Logger instance created
- ✅ `.env.example` updated

---

## Phase 2: Wide Event Type Definitions

### Tasks

#### 2.1 Create Logging Types
**File**: `src/types/logging.ts`

```typescript
// Base event fields (always present)
export interface BaseEvent {
  event_type: string;
  environment: 'development' | 'production';
  service_name: 'yep-savings-bot';
  version: string;
  // timestamp added automatically by Axiom
}

// Contextual fields (included when relevant)
export interface EventContext {
  user_id?: number;
  store_id?: number;
  deal_id?: string;
  product_upc?: string;
  command?: string;
  callback_action?: string;
}

// Specific event types
export interface DealProcessedEvent extends BaseEvent, EventContext {
  event_type: 'deal.processed';
  original_price?: number;
  current_price?: number;
  discount_percentage?: number;
  processing_duration_ms: number;
  created: boolean;
  updated: boolean;
  expired?: boolean;
}

export interface NotificationEvent extends BaseEvent, EventContext {
  event_type: 'notification.sent' | 'notification.failed';
  success: boolean;
  error_message?: string;
  has_image: boolean;
  message_length: number;
}

export interface ApiCallEvent extends BaseEvent {
  event_type: 'yep.api.request' | 'yep.api.success' | 'yep.api.error';
  store_id: number;
  page?: number;
  duration_ms?: number;
  deals_count?: number;
  error_message?: string;
  status_code?: number;
}

export interface UserActionEvent extends BaseEvent, EventContext {
  event_type: 'user.command' | 'user.callback' | 'user.created';
  command?: string;
  action?: string;
  success: boolean;
}

export interface ErrorEvent extends BaseEvent, EventContext {
  event_type: 'error.unhandled' | 'error.validation' | 'error.network' | 'error.database';
  error_message: string;
  error_stack?: string;
  error_code?: string;
}

export interface JobEvent extends BaseEvent {
  event_type: 'job.daily_parse.start' | 'job.daily_parse.complete' | 'job.daily_parse.error';
  stores_count?: number;
  deals_processed?: number;
  new_deals_found?: number;
  notifications_sent?: number;
  duration_ms?: number;
  error_message?: string;
}

// Union type for all events
export type WideEvent =
  | DealProcessedEvent
  | NotificationEvent
  | ApiCallEvent
  | UserActionEvent
  | ErrorEvent
  | JobEvent;
```

#### 2.2 Create Event Type Constants
**File**: `src/utils/eventTypes.ts`

```typescript
export const EventTypes = {
  // System
  APP_STARTUP: 'app.startup',
  APP_SHUTDOWN: 'app.shutdown',
  HEALTH_CHECK: 'health.check',

  // API
  YEP_API_REQUEST: 'yep.api.request',
  YEP_API_SUCCESS: 'yep.api.success',
  YEP_API_ERROR: 'yep.api.error',

  // Deal Processing
  DEAL_PROCESSED: 'deal.processed',
  DEAL_EXPIRED: 'deal.expired',
  DEAL_NEW_DETECTED: 'deal.new_detected',
  PROCESSING_BATCH_COMPLETE: 'processing.batch_complete',

  // Notifications
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  NOTIFICATION_BATCH_COMPLETE: 'notification.batch_complete',

  // User Actions
  USER_CREATED: 'user.created',
  USER_COMMAND: 'user.command',
  USER_CALLBACK: 'user.callback',
  USER_SETTINGS_CHANGED: 'user.settings_changed',

  // Database
  DB_QUERY: 'db.query',
  DB_ERROR: 'db.error',
  DB_MIGRATION: 'db.migration',

  // Jobs
  JOB_DAILY_PARSE_START: 'job.daily_parse.start',
  JOB_DAILY_PARSE_COMPLETE: 'job.daily_parse.complete',
  JOB_DAILY_PARSE_ERROR: 'job.daily_parse.error',

  // Errors
  ERROR_UNHANDLED: 'error.unhandled',
  ERROR_VALIDATION: 'error.validation',
  ERROR_NETWORK: 'error.network',
  ERROR_DATABASE: 'error.database',
} as const;
```

**Deliverables**:
- ✅ Event type definitions created
- ✅ Event constants defined
- ✅ TypeScript types for type safety

---

## Phase 3: Logger Utility Helpers

### Tasks

#### 3.1 Create Logger Helpers
**File**: `src/utils/logger.ts`

```typescript
import { logger as axiomLogger } from '../config/axiom.js';
import { env } from '../config/env.js';
import type { EventContext } from '../types/logging.js';

// Base event fields added to all logs
const baseFields = {
  environment: env.NODE_ENV,
  service_name: 'yep-savings-bot' as const,
  version: '1.0.0', // Could read from package.json
};

// Helper to merge base fields with event data
function enrichEvent<T extends Record<string, unknown>>(
  eventType: string,
  data: T,
  context?: EventContext
): T & typeof baseFields & EventContext & { event_type: string } {
  return {
    ...baseFields,
    event_type: eventType,
    ...context,
    ...data,
  };
}

// Convenience methods for different log levels
export const log = {
  info: <T extends Record<string, unknown>>(
    eventType: string,
    data: T,
    context?: EventContext
  ) => {
    axiomLogger.info(eventType, enrichEvent(eventType, data, context));
  },

  warn: <T extends Record<string, unknown>>(
    eventType: string,
    data: T,
    context?: EventContext
  ) => {
    axiomLogger.warn(eventType, enrichEvent(eventType, data, context));
  },

  error: <T extends Record<string, unknown>>(
    eventType: string,
    data: T,
    context?: EventContext
  ) => {
    axiomLogger.error(eventType, enrichEvent(eventType, data, context));
  },

  debug: <T extends Record<string, unknown>>(
    eventType: string,
    data: T,
    context?: EventContext
  ) => {
    axiomLogger.debug(eventType, enrichEvent(eventType, data, context));
  },
};

// Flush logs (call on shutdown)
export async function flushLogs(): Promise<void> {
  await axiomLogger.flush();
}
```

#### 3.2 Create Error Logger Helper
**File**: `src/utils/errorLogger.ts`

```typescript
import { log } from './logger.js';
import { EventTypes } from './eventTypes.js';
import type { EventContext } from '../types/logging.js';

export function logError(
  error: Error | unknown,
  context?: EventContext & { error_type?: string }
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  log.error(
    context?.error_type || EventTypes.ERROR_UNHANDLED,
    {
      error_message: errorMessage,
      error_stack: errorStack,
      error_name: error instanceof Error ? error.name : 'Unknown',
    },
    context
  );
}
```

**Deliverables**:
- ✅ Logger wrapper with automatic field enrichment
- ✅ Error logging helper
- ✅ Type-safe logging methods

---

## Phase 4: Application Lifecycle Logging

### Tasks

#### 4.1 Update `src/index.ts`
Add logging for startup, shutdown, and endpoints:

```typescript
import { log, flushLogs } from './utils/logger.js';
import { EventTypes } from './utils/eventTypes.js';
import { logError } from './utils/errorLogger.js';

// At startup
log.info(EventTypes.APP_STARTUP, {
  node_version: process.version,
  environment: env.NODE_ENV,
  webhook_mode: isWebhookMode,
});

// Health check endpoint
if (req.url === '/health') {
  log.debug(EventTypes.HEALTH_CHECK, {
    endpoint: '/health',
  });
  // ... existing code
}

// Daily parse endpoint
if (req.url === '/daily-parse') {
  log.info('endpoint.daily_parse.triggered', {
    endpoint: '/daily-parse',
    trigger_source: 'external_cron',
  });
  // ... existing code
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  log.info(EventTypes.APP_SHUTDOWN, {
    signal: 'SIGTERM',
  });
  await flushLogs();
  process.exit(0);
});

process.on('SIGINT', async () => {
  log.info(EventTypes.APP_SHUTDOWN, {
    signal: 'SIGINT',
  });
  await flushLogs();
  process.exit(0);
});

// Unhandled errors
process.on('uncaughtException', async (error) => {
  logError(error, { error_type: EventTypes.ERROR_UNHANDLED });
  await flushLogs();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  logError(reason, { error_type: EventTypes.ERROR_UNHANDLED });
  await flushLogs();
  process.exit(1);
});
```

**Deliverables**:
- ✅ Startup logging
- ✅ Shutdown logging with flush
- ✅ Global error handlers with logging

---

## Phase 5: API Call Logging

### Tasks

#### 5.1 Update `src/services/yepApi/dealParser.ts`

```typescript
import { log } from '../../utils/logger.js';
import { logError } from '../../utils/errorLogger.js';
import { EventTypes } from '../../utils/eventTypes.js';

export async function fetchDealsForStore(
  storeId: number,
  page: number = 1
): Promise<FetchDealsResult> {
  const startTime = Date.now();

  log.info(EventTypes.YEP_API_REQUEST, {
    store_id: storeId,
    page,
  });

  try {
    const response = await yepApiClient.get<YepApiResponse>('/search.php', {
      params: { action: 'sd', store: storeId, p: page },
    });

    const duration = Date.now() - startTime;
    const dealData = getDealDataFromResponse(response.data);

    if (!dealData) {
      log.error(EventTypes.YEP_API_ERROR, {
        store_id: storeId,
        page,
        duration_ms: duration,
        error_message: 'API returned error response',
        response_data: typeof response.data.data === 'string' ? response.data.data : 'unknown',
      });
      return { success: false, error: 'API returned error response', deals: [] };
    }

    log.info(EventTypes.YEP_API_SUCCESS, {
      store_id: storeId,
      page,
      duration_ms: duration,
      deals_count: dealData.deal_items?.length || 0,
    });

    // ... rest of existing code

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(error, {
      error_type: EventTypes.YEP_API_ERROR,
      store_id: storeId,
    });

    log.error(EventTypes.YEP_API_ERROR, {
      store_id: storeId,
      page,
      duration_ms: duration,
      error_message: error instanceof Error ? error.message : String(error),
    });

    // ... existing error handling
  }
}
```

**Deliverables**:
- ✅ API request logging with timing
- ✅ Success logging with response stats
- ✅ Error logging with context

---

## Phase 6: Deal Processing Logging

### Tasks

#### 6.1 Update `src/services/dealProcessor.ts`

```typescript
import { log } from '../utils/logger.js';
import { EventTypes } from '../utils/eventTypes.js';

// In processDealsFromApi function
export async function processDealsFromApi(/* ... */): Promise<ProcessingStats> {
  const startTime = Date.now();
  
  // ... existing code ...

  for (const dealItem of dealItems) {
    const dealStartTime = Date.now();
    
    try {
      // ... process deal ...
      
      log.info(EventTypes.DEAL_PROCESSED, {
        deal_id: dealItem.deal_id,
        product_upc: dealItem.upc_code,
        store_id: storeId,
        original_price: dealItem.source_price ? parseFloat(dealItem.source_price) : undefined,
        current_price: dealItem.current_price ? parseFloat(dealItem.current_price) : undefined,
        discount_percentage: calculateDiscount(dealItem.source_price, dealItem.current_price),
        processing_duration_ms: Date.now() - dealStartTime,
        created: !existingProduct,
        updated: !!existingProduct,
        expired: isExpired,
      });

    } catch (error) {
      logError(error, {
        error_type: EventTypes.ERROR_DATABASE,
        deal_id: dealItem.deal_id,
        product_upc: dealItem.upc_code,
      });
    }
  }

  const totalDuration = Date.now() - startTime;

  log.info(EventTypes.PROCESSING_BATCH_COMPLETE, {
    store_id: storeId,
    deals_processed: dealItems.length,
    products_created: stats.productsCreated,
    products_updated: stats.productsUpdated,
    deals_created: stats.dealsCreated,
    deals_updated: stats.dealsUpdated,
    deals_expired: stats.dealsExpired,
    duration_ms: totalDuration,
  });

  return stats;
}
```

**Deliverables**:
- ✅ Per-deal processing logs
- ✅ Batch completion summary
- ✅ Performance timing

---

## Phase 7: Notification Logging

### Tasks

#### 7.1 Update `src/services/notificationService.ts`

```typescript
import { log } from '../utils/logger.js';
import { logError } from '../utils/errorLogger.js';
import { EventTypes } from '../utils/eventTypes.js';

export async function sendDealNotification(/* ... */): Promise<boolean> {
  try {
    // ... existing notification code ...

    log.info(EventTypes.NOTIFICATION_SENT, {
      user_id: userId,
      deal_id: deal.dealId,
      store_id: deal.storeId,
      product_upc: product.upcCode,
      success: true,
      has_image: !!product.images,
      message_length: message.length,
    });

    return true;
  } catch (error) {
    logError(error, {
      error_type: EventTypes.NOTIFICATION_FAILED,
      user_id: userId,
      deal_id: deal.dealId,
    });

    log.error(EventTypes.NOTIFICATION_FAILED, {
      user_id: userId,
      deal_id: deal.dealId,
      success: false,
      error_message: error instanceof Error ? error.message : String(error),
    });

    return false;
  }
}

export async function sendBatchNotifications(/* ... */): Promise<void> {
  const startTime = Date.now();
  let successCount = 0;
  let failureCount = 0;

  // ... existing batch code ...

  log.info(EventTypes.NOTIFICATION_BATCH_COMPLETE, {
    total_notifications: userIds.length,
    success_count: successCount,
    failure_count: failureCount,
    duration_ms: Date.now() - startTime,
  });
}
```

**Deliverables**:
- ✅ Individual notification logging
- ✅ Batch notification summary
- ✅ Success/failure tracking

---

## Phase 8: User Action Logging

### Tasks

#### 8.1 Update `src/bot/commands/*.ts`

**In `start.ts`**:
```typescript
log.info(EventTypes.USER_COMMAND, {
  user_id: msg.from.id,
  command: 'start',
  success: true,
});
```

**In `deals.ts`**:
```typescript
log.info(EventTypes.USER_COMMAND, {
  user_id: msg.from.id,
  store_id: user.storeId,
  command: 'deals',
  success: true,
  deals_shown: activeDeals.length,
});
```

**In `favorites.ts`**:
```typescript
log.info(EventTypes.USER_COMMAND, {
  user_id: msg.from.id,
  command: 'favorites',
  success: true,
  favorites_count: favoriteDeals.length,
});
```

**In `settings.ts`**:
```typescript
log.info(EventTypes.USER_SETTINGS_CHANGED, {
  user_id: user.telegramId,
  setting: 'store',
  old_value: user.storeId,
  new_value: newStoreId,
});
```

#### 8.2 Update `src/bot/handlers/callbackHandler.ts`

```typescript
log.info(EventTypes.USER_CALLBACK, {
  user_id: query.from.id,
  callback_action: action,
  deal_id: dealId,
  success: true,
});
```

**Deliverables**:
- ✅ Command execution logging
- ✅ Callback action logging
- ✅ User preference changes logged

---

## Phase 9: Job Execution Logging

### Tasks

#### 9.1 Update `src/schedulers/dailyParser.ts`

```typescript
import { log } from '../utils/logger.js';
import { logError } from '../utils/errorLogger.js';
import { EventTypes } from '../utils/eventTypes.js';

export async function runDailyParse(/* ... */): Promise<void> {
  const startTime = Date.now();
  let totalDealsProcessed = 0;
  let totalNewDeals = 0;
  let totalNotifications = 0;

  log.info(EventTypes.JOB_DAILY_PARSE_START, {
    manual_trigger: options?.manual || false,
    stores_count: storeIds.length,
  });

  try {
    // ... existing processing loop ...

    log.info(EventTypes.JOB_DAILY_PARSE_COMPLETE, {
      stores_count: storeIds.length,
      deals_processed: totalDealsProcessed,
      new_deals_found: totalNewDeals,
      notifications_sent: totalNotifications,
      duration_ms: Date.now() - startTime,
    });

  } catch (error) {
    logError(error, {
      error_type: EventTypes.JOB_DAILY_PARSE_ERROR,
    });

    log.error(EventTypes.JOB_DAILY_PARSE_ERROR, {
      stores_count: storeIds.length,
      error_message: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime,
    });

    throw error;
  }
}
```

**Deliverables**:
- ✅ Job start logging
- ✅ Job completion with statistics
- ✅ Job error logging

---

## Phase 10: Database Query Logging (Optional)

### Tasks

#### 10.1 Add Slow Query Logging
**File**: `src/database/queries.ts`

Add wrapper for timing critical queries:

```typescript
import { log } from '../utils/logger.js';
import { EventTypes } from '../utils/eventTypes.js';

async function logSlowQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  threshold: number = 100
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;

    if (duration > threshold) {
      log.warn(EventTypes.DB_QUERY, {
        query_name: queryName,
        duration_ms: duration,
        slow_query: true,
      });
    }

    return result;
  } catch (error) {
    logError(error, {
      error_type: EventTypes.DB_ERROR,
    });
    throw error;
  }
}

// Example usage in expensive queries
export async function getActiveDealsWithProducts(storeId: number) {
  return logSlowQuery(
    'getActiveDealsWithProducts',
    async () => {
      return await db
        .select(/* ... */)
        .from(deals)
        // ... rest of query
    }
  );
}
```

**Note**: Only add to queries you suspect might be slow. Too much query logging can be noisy.

**Deliverables**:
- ✅ Slow query detection (optional)
- ✅ Database error logging

---

## Phase 11: Documentation

### Tasks

#### 11.1 Create Logging Documentation
**File**: `docs/LOGGING.md`

Create comprehensive logging documentation (see template in next artifact).

#### 11.2 Update Deployment Documentation
**File**: `DEPLOYMENT.md`

Add Axiom setup section:

```markdown
## Axiom Logging Setup

### 1. Create Axiom Account
- Sign up at https://axiom.co
- Create a new dataset: `costco-deals-bot`

### 2. Generate API Token
- Go to Settings → API Tokens
- Create token with "Ingest" permission
- Copy token to `.env` as `AXIOM_TOKEN`

### 3. Configure Environment
```bash
AXIOM_TOKEN=xaat-your-token-here
AXIOM_DATASET=costco-deals-bot
LOG_LEVEL=info
```

### 4. Verify Logging
```bash
# Check logs are flowing
npm run dev
# Trigger some actions, then check Axiom UI
```
```

#### 11.3 Create Query Examples
**File**: `docs/AXIOM_QUERIES.md`

Document common queries (see template below).

**Deliverables**:
- ✅ `docs/LOGGING.md` created
- ✅ `DEPLOYMENT.md` updated
- ✅ `docs/AXIOM_QUERIES.md` created

---

## Phase 12: Testing & Validation

### Tasks

#### 12.1 Local Testing
- [ ] Run bot locally with Axiom configured
- [ ] Trigger all commands (`/start`, `/deals`, `/favorites`, `/settings`)
- [ ] Trigger daily parse job manually
- [ ] Generate some errors intentionally
- [ ] Verify logs appear in Axiom UI

#### 12.2 Verify Event Structure
- [ ] Check that all events have required base fields
- [ ] Verify contextual fields appear when expected
- [ ] Ensure no PII is logged (passwords, tokens, etc.)
- [ ] Check timestamp formats are correct

#### 12.3 Performance Check
- [ ] Monitor log volume (should be <1000 events/minute)
- [ ] Check batching is working (logs sent in groups)
- [ ] Verify no blocking on log writes
- [ ] Test flush on shutdown works correctly

**Deliverables**:
- ✅ All event types verified in Axiom
- ✅ Performance validated
- ✅ No blocking behavior

---

## Phase 13: Axiom Configuration

### Tasks

#### 13.1 Configure Dataset
- [ ] Set retention to 30 days (or per budget)
- [ ] Create field extractions for common fields:
  - `event_type` (string)
  - `user_id` (number)
  - `store_id` (number)
  - `deal_id` (string)
  - `success` (boolean)

#### 13.2 Create Dashboards

**Operations Dashboard**:
- Error rate over time (by `event_type`)
- API call success/failure ratio
- Job execution status
- Notification success rate

**Business Metrics Dashboard**:
- Deals processed per day
- New deals detected per day
- Notifications sent per day
- Top stores by activity

**Performance Dashboard**:
- API response times (p50, p95, p99)
- Deal processing duration
- Database query times

#### 13.3 Set Up Alerts
- [ ] High error rate: >5% errors in 5 minutes
- [ ] API failures: >10 failures in 1 minute
- [ ] Job failures: Any `job.daily_parse.error`
- [ ] Notification failures: >50% failed in 10 minutes

**Deliverables**:
- ✅ Dataset configured
- ✅ Dashboards created
- ✅ Alerts configured

---

## Implementation Checklist

### Phase 1: Setup ✅
- [ ] Install `@axiomhq/logging`
- [ ] Add environment variables
- [ ] Create Axiom config
- [ ] Update `.env.example`

### Phase 2: Types ✅
- [ ] Create event type definitions
- [ ] Create event constants
- [ ] Export from types barrel

### Phase 3: Utilities ✅
- [ ] Create logger wrapper
- [ ] Create error logger
- [ ] Add flush helper

### Phase 4-9: Integration ✅
- [ ] Application lifecycle logging
- [ ] API call logging
- [ ] Deal processing logging
- [ ] Notification logging
- [ ] User action logging
- [ ] Job execution logging

### Phase 10: Database (Optional) ✅
- [ ] Add slow query logging

### Phase 11: Documentation ✅
- [ ] Create `docs/LOGGING.md`
- [ ] Update `DEPLOYMENT.md`
- [ ] Create `docs/AXIOM_QUERIES.md`

### Phase 12: Testing ✅
- [ ] Local testing
- [ ] Event verification
- [ ] Performance validation

### Phase 13: Axiom Setup ✅
- [ ] Configure dataset
- [ ] Create dashboards
- [ ] Set up alerts

---

## Estimated Effort

| Phase | Time | Complexity |
|-------|------|------------|
| 1. Setup | 30 min | Low |
| 2. Types | 45 min | Medium |
| 3. Utilities | 30 min | Low |
| 4. Lifecycle | 30 min | Low |
| 5. API Logging | 45 min | Medium |
| 6. Deal Processing | 1 hour | Medium |
| 7. Notifications | 45 min | Medium |
| 8. User Actions | 1 hour | Medium |
| 9. Job Logging | 30 min | Low |
| 10. DB Queries | 30 min | Low (Optional) |
| 11. Documentation | 1 hour | Low |
| 12. Testing | 1 hour | Medium |
| 13. Axiom Config | 1 hour | Medium |

**Total: ~9-10 hours**

---

## Success Criteria

✅ All event types flowing to Axiom
✅ <100ms p95 latency added by logging
✅ No blocking on log writes
✅ Graceful shutdown with log flush
✅ Dashboards showing key metrics
✅ Alerts configured for critical issues
✅ Documentation complete
✅ Team trained on querying logs

---

## Benefits Summary

### Wide Events Approach
- **One event = one story**: Complete context in single log
- **Easy debugging**: All relevant data together
- **Simple querying**: No joins needed
- **Performance**: Minimal overhead with batching

### `@axiomhq/logging` Benefits
- **Automatic batching**: Efficient log shipping
- **Built-in retries**: Resilient to network issues
- **Type-safe**: Full TypeScript support
- **Best practices**: Industry-standard patterns

### Business Value
- **Faster debugging**: Find issues in seconds, not hours
- **Better insights**: Understand user behavior and system health
- **Proactive monitoring**: Catch issues before users report them
- **Data-driven decisions**: Metrics to guide improvements

---

## Next Steps

1. **Start with Phase 1**: Get Axiom connected
2. **Implement Phase 2-3**: Build logging foundation
3. **Add logging incrementally**: One service at a time
4. **Test as you go**: Verify each integration
5. **Document patterns**: Help future developers
6. **Monitor and iterate**: Refine based on actual usage

Ready to implement! 🚀