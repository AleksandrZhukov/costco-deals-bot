# Logging Guide

This guide covers how to use structured logging in the YEP Savings Deal Bot using Axiom.

## Overview

The bot uses **Wide Events** (Canonical Log Lines) pattern - one rich event per logical operation containing all relevant context. This approach makes debugging faster and provides complete visibility into system behavior.

### Key Benefits

- **Complete context**: Each log contains all relevant information
- **Easy querying**: No complex joins needed
- **Type-safe**: Full TypeScript support with Zod validation
- **Performance**: Automatic batching with <100ms overhead
- **Resilient**: Built-in retries and graceful shutdown

## Quick Start

### Basic Logging

```typescript
import { log } from '../utils/logger.js';
import { EventTypes } from '../utils/eventTypes.js';

// Info level
log.info(EventTypes.USER_COMMAND, {
  command: 'start',
  user_id: 123456789,
});

// Warning level
log.warn(EventTypes.DB_QUERY, {
  query_name: 'getActiveDeals',
  duration_ms: 150,
  slow_query: true,
});

// Error level
log.error(EventTypes.YEP_API_ERROR, {
  store_id: 25,
  error_message: 'Connection timeout',
});

// Debug level (only visible in development)
log.debug(EventTypes.HEALTH_CHECK, {
  endpoint: '/health',
});
```

### Adding Context

Context fields are automatically propagated to all events in the same flow:

```typescript
import { log, withContext } from '../utils/logger.js';

// Create a context-aware logger
const userLogger = withContext({
  user_id: 123456789,
  store_id: 25,
});

// Context is automatically included
userLogger.info(EventTypes.USER_COMMAND, {
  command: 'deals',
  deals_shown: 5,
});

// Result includes user_id and store_id automatically
```

### Using Specialized Trackers

The logger provides specialized trackers for common operations:

#### API Call Tracker

```typescript
import { createApiCallTracker } from '../utils/logger.js';

const tracker = createApiCallTracker(25, 1); // storeId, page

try {
  const response = await yepApi.get('/api/deals', { params: { storeId: 25 } });
  tracker.success(response.data.deals.length, 200);
} catch (error) {
  tracker.error(error.message, 500);
}
```

#### Deal Processing Tracker

```typescript
import { createDealTracker } from '../utils/logger.js';

const tracker = createDealTracker('deal-123', 25, '01234567890');

try {
  await processDeal(deal);
  tracker.processed({
    originalPrice: 10.99,
    currentPrice: 8.99,
    discountPercentage: 18,
    created: true,
    updated: false,
  });
} catch (error) {
  logError(error, { deal_id: 'deal-123' });
}
```

#### Notification Tracker

```typescript
import { createNotificationTracker } from '../utils/logger.js';

const tracker = createNotificationTracker(userId, 'deal-123');

try {
  await bot.sendPhoto(userId, photoUrl, { caption: message });
  tracker.sent({
    storeId: 25,
    productUpc: '01234567890',
    hasImage: true,
    messageLength: message.length,
  });
} catch (error) {
  tracker.failed(error.message);
}
```

#### Job Tracker

```typescript
import { createJobTracker } from '../utils/logger.js';

const tracker = createJobTracker('daily_parse', true); // manual trigger

try {
  await runDailyParse();
  tracker.complete({
    storesCount: 8,
    dealsProcessed: 150,
    newDealsFound: 20,
    notificationsSent: 35,
  });
} catch (error) {
  tracker.error(error.message, {
    storesCount: 8,
    dealsProcessed: 100,
  });
}
```

#### User Action Tracker

```typescript
import { createUserActionTracker } from '../utils/logger.js';

const tracker = createUserActionTracker(userId);

// Log command
tracker.command('deals', {
  store_id: 25,
  deals_shown: 5,
});

// Log callback
tracker.callback('favorite', {
  deal_id: 'deal-123',
});

// Log settings change
tracker.settingsChanged('store', 25, 28);

// Log user creation
tracker.created();
```

## Event Types Reference

### System Events

| Event Type | Level | Description | Common Fields |
|-----------|-------|-------------|---------------|
| `app.startup` | info | Application startup | node_version, webhook_mode, health_check_port |
| `app.shutdown` | info | Application shutdown | signal |
| `health.check` | debug | Health check endpoint | endpoint |

### API Events

| Event Type | Level | Description | Common Fields |
|-----------|-------|-------------|---------------|
| `yep.api.request` | info | API request initiated | store_id, page |
| `yep.api.success` | info | API request succeeded | store_id, page, duration_ms, deals_count, status_code |
| `yep.api.error` | error | API request failed | store_id, page, duration_ms, error_message, status_code |

### Deal Events

| Event Type | Level | Description | Common Fields |
|-----------|-------|-------------|---------------|
| `deal.processed` | info | Individual deal processed | deal_id, product_upc, store_id, original_price, current_price, discount_percentage, processing_duration_ms, created, updated, expired |
| `deal.expired` | info | Deal marked as expired | deal_id, end_time, expired_at |
| `deal.new_detected` | info | New deal found | deal_id, store_id |
| `processing.batch_complete` | info | Batch processing finished | store_id, deals_processed, products_created, products_updated, deals_created, deals_updated, deals_expired, duration_ms |

### Notification Events

| Event Type | Level | Description | Common Fields |
|-----------|-------|-------------|---------------|
| `notification.sent` | info | Notification sent successfully | user_id, deal_id, store_id, product_upc, success, has_image, message_length |
| `notification.failed` | error | Notification failed | user_id, deal_id, success, error_message |
| `notification.batch_complete` | info | Batch notifications finished | total_notifications, success_count, failure_count, duration_ms |

### User Events

| Event Type | Level | Description | Common Fields |
|-----------|-------|-------------|---------------|
| `user.created` | info | New user registered | user_id |
| `user.command` | info | User executed command | user_id, command, success |
| `user.callback` | info | User clicked inline button | user_id, callback_action, deal_id, action, success |
| `user.settings_changed` | info | User updated settings | user_id, setting, old_value, new_value |

### Database Events

| Event Type | Level | Description | Common Fields |
|-----------|-------|-------------|---------------|
| `db.query` | warn/debug | Slow database query | query_name, duration_ms, slow_query, threshold_ms |
| `db.error` | error | Database operation failed | query_name, error_message |
| `db.migration` | info | Database migration ran | migration_name |

### Job Events

| Event Type | Level | Description | Common Fields |
|-----------|-------|-------------|---------------|
| `job.daily_parse.start` | info | Daily parse started | manual_trigger, stores_count |
| `job.daily_parse.complete` | info | Daily parse finished | stores_count, deals_processed, new_deals_found, notifications_sent, duration_ms |
| `job.daily_parse.error` | error | Daily parse failed | stores_count, deals_processed, error_message, duration_ms |

### Error Events

| Event Type | Level | Description | Common Fields |
|-----------|-------|-------------|---------------|
| `error.unhandled` | error | Unhandled error | error_message, error_stack, error_name |
| `error.validation` | error | Input validation failed | error_message, error_stack |
| `error.network` | error | Network request failed | error_message, error_code |
| `error.database` | error | Database operation failed | error_message, error_stack, query_name |

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ Good - Use appropriate levels
log.info(EventTypes.USER_COMMAND, { command: 'deals' });        // Normal operation
log.warn(EventTypes.DB_QUERY, { slow_query: true });              // Performance issue
log.error(EventTypes.YEP_API_ERROR, { error_message: '...' });  // Failure
log.debug(EventTypes.HEALTH_CHECK, { endpoint: '/health' });    // Development only

// ❌ Bad - Don't use error for normal operations
log.error(EventTypes.USER_COMMAND, { command: 'deals' });
```

### 2. Include All Relevant Context

```typescript
// ✅ Good - Complete context
log.info(EventTypes.NOTIFICATION_SENT, {
  user_id: 123456789,
  deal_id: 'deal-123',
  store_id: 25,
  success: true,
  has_image: true,
  message_length: 245,
});

// ❌ Bad - Missing context
log.info(EventTypes.NOTIFICATION_SENT, { success: true });
```

### 3. Use Correlation IDs for Tracing

```typescript
// Correlation IDs are automatically generated by trackers
const tracker = createDealTracker('deal-123', 25);
tracker.processed({ created: true });

// Manual correlation
const correlationId = generateCorrelationId();
log.info(EventTypes.USER_COMMAND, { command: 'deals' }, { correlation_id });
log.info(EventTypes.DEAL_PROCESSED, { deal_id: 'deal-123' }, { correlation_id });
```

### 4. Measure Performance

```typescript
// ✅ Good - Track duration
const tracker = createApiCallTracker(25, 1);
// ... API call ...
tracker.success(10, 200); // duration_ms automatically calculated

// Manual timing
const startTime = Date.now();
await someOperation();
log.info(EventTypes.DEAL_PROCESSED, {
  processing_duration_ms: Date.now() - startTime,
});
```

### 5. Never Log Sensitive Data

```typescript
// ❌ BAD - Never log sensitive information
log.info(EventTypes.USER_CREATED, {
  user_id: userId,
  password: userPassword,      // NEVER log passwords
  token: apiToken,             // NEVER log tokens
  ssn: userSsn,               // NEVER log PII
  credit_card: userCardNumber, // NEVER log financial info
});

// ✅ Good - Log only identifiers
log.info(EventTypes.USER_CREATED, {
  user_id: userId,
});
```

### 6. Use Specialized Error Logging

```typescript
import { logError, logValidationError, logNetworkError, logDatabaseError } from '../utils/errorLogger.js';

// ✅ Good - Use specialized error loggers
try {
  await validateInput(data);
} catch (error) {
  logValidationError(error, { user_id: userId });
}

try {
  await apiCall();
} catch (error) {
  logNetworkError(error, { store_id: 25, error_code: 'TIMEOUT' });
}

try {
  await dbQuery();
} catch (error) {
  logDatabaseError(error, { query_name: 'getActiveDeals' });
}

// ❌ Bad - Generic error handling
try {
  await someOperation();
} catch (error) {
  log.error('error.unhandled', { error: error.message });
}
```

### 7. Log at Appropriate Points

```typescript
// ✅ Good - Log at key points in a flow
async function processDeal(dealId: string) {
  const tracker = createDealTracker(dealId, 25);

  log.debug(EventTypes.DEAL_PROCESSED, {
    deal_id: dealId,
    step: 'fetching',
  });

  const deal = await fetchDeal(dealId);

  log.debug(EventTypes.DEAL_PROCESSED, {
    deal_id: dealId,
    step: 'validating',
  });

  validateDeal(deal);

  log.debug(EventTypes.DEAL_PROCESSED, {
    deal_id: dealId,
    step: 'saving',
  });

  await saveDeal(deal);

  tracker.processed({ created: true });
}

// ❌ Bad - Too much logging (noise)
async function processDeal(dealId: string) {
  log.debug(EventTypes.DEAL_PROCESSED, { deal_id: dealId, step: 'start' });
  const deal = await fetchDeal(dealId);
  log.debug(EventTypes.DEAL_PROCESSED, { deal_id: dealId, step: 'fetched' });
  validateDeal(deal);
  log.debug(EventTypes.DEAL_PROCESSED, { deal_id: dealId, step: 'validated' });
  await saveDeal(deal);
  log.debug(EventTypes.DEAL_PROCESSED, { deal_id: dealId, step: 'saved' });
}
```

## Creating New Event Types

### Step 1: Add Event Type Constant

```typescript
// src/utils/eventTypes.ts
export const EventTypes = {
  // ... existing types
  YOUR_NEW_EVENT: 'your.new.event',
} as const;
```

### Step 2: Add Type Definition

```typescript
// src/types/logging.ts
export const YourNewEventSchema = z.object({
  event_type: z.literal('your.new.event'),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
  your_field: z.string(),
  another_field: z.number().optional(),
});

export interface YourNewEvent extends BaseEvent {
  event_type: 'your.new.event';
  your_field: string;
  another_field?: number;
}

export type WideEvent = YourNewEvent | /* other events */;
export const WideEventSchema = z.discriminatedUnion('event_type', [
  YourNewEventSchema,
  // ... other schemas
]);
```

### Step 3: Use the Event

```typescript
log.info(EventTypes.YOUR_NEW_EVENT, {
  your_field: 'value',
  another_field: 123,
});
```

### Full Example: Adding a "Rate Limit Hit" Event

```typescript
// 1. Add constant to src/utils/eventTypes.ts
export const EventTypes = {
  // ... existing
  RATE_LIMIT_HIT: 'rate_limit.hit',
} as const;

// 2. Add type to src/types/logging.ts
export const RateLimitEventSchema = z.object({
  event_type: z.literal('rate_limit.hit'),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
  user_id: z.number().optional(),
  endpoint: z.string(),
  retry_after: z.number(),
});

export interface RateLimitEvent extends BaseEvent {
  event_type: 'rate_limit.hit';
  user_id?: number;
  endpoint: string;
  retry_after: number;
}

export type WideEvent = RateLimitEvent | /* other events */;
export const WideEventSchema = z.discriminatedUnion('event_type', [
  RateLimitEventSchema,
  // ... other schemas
]);

// 3. Use in code
log.warn(EventTypes.RATE_LIMIT_HIT, {
  user_id: userId,
  endpoint: '/api/deals',
  retry_after: 60,
});
```

## Viewing Logs in Axiom

### Accessing Logs

1. Go to https://axiom.co
2. Select your dataset: `costco-deals-bot`
3. Use the query editor to filter logs

### Example Queries

See [AXIOM_QUERIES.md](./AXIOM_QUERIES.md) for common query examples.

## Performance Considerations

### Logging Overhead

- **Target**: <100ms p95 latency added by logging
- **Mechanism**: Automatic batching (logs sent in groups)
- **Async**: Non-blocking log writes

### Best Practices for Performance

```typescript
// ✅ Good - Batching reduces overhead
for (const deal of deals) {
  await processDeal(deal);
}
// Logs are batched and sent automatically

// ✅ Good - Trackers reduce overhead
const tracker = createBatchTracker();
for (const item of items) {
  await processItem(item);
}
tracker.complete('batch.complete', { count: items.length });

// ❌ Bad - Excessive logging
for (const item of items) {
  log.info('item.processed', { item_id: item.id });
  log.info('item.validated', { item_id: item.id });
  log.info('item.saved', { item_id: item.id });
}
```

## Troubleshooting

### Logs Not Appearing

1. Check `AXIOM_TOKEN` is correct in `.env`
2. Verify dataset name matches `AXIOM_DATASET`
3. Check log level: `LOG_LEVEL` (set to `debug` to see all logs)
4. Verify network connectivity to Axiom

### Performance Issues

1. Check for slow queries: Look for `db.query` events with `slow_query: true`
2. Check API times: Look for `yep.api.success` with high `duration_ms`
3. Review deal processing: Check `processing.batch_complete` for high `duration_ms`

### Too Many Logs

1. Reduce log level: Set `LOG_LEVEL=warn` or `LOG_LEVEL=error`
2. Remove debug logs from production
3. Use aggregation for batch operations

## Additional Resources

- [Axiom Documentation](https://axiom.co/docs)
- [AXIOM_QUERIES.md](./AXIOM_QUERIES.md) - Query examples
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Setup instructions
