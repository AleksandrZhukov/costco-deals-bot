# Logging Validation Tests

This directory contains test suites to validate the Axiom Wide Event Logging implementation.

## Test Suites

### 1. Logging Validation Test (`logging-validation.test.ts`)

Comprehensive validation of the logging implementation covering:

- **Event Type Definitions** (27 events)
- **Logging Types** (BaseEvent, EventContext, WideEvent, schemas)
- **Logger Utilities** (log object, flushLogs, trackers)
- **Error Logger** (logError, specialized error loggers)
- **Axiom Configuration** (imports, env vars, exports)
- **Index.ts Integration** (startup, shutdown, health check, error handlers)
- **Service Integration** (dealParser, dealProcessor, notificationService)
- **Bot Integration** (commands and callbacks)
- **Daily Parser** (job tracking, error logging)
- **Event Usage** (coverage across codebase)

**Total Checks: 74**

**Run:**
```bash
npx tsx test/logging-validation.test.ts
```

**Expected Output:**
```
✅ ALL VALIDATION CHECKS PASSED!
Success Rate: 100.0%
```

### 2. Event Coverage Test (`coverage.test.ts`)

Analyzes which event types are actually used in the codebase:

- Scans all TypeScript files in `src/`
- Identifies event type usage patterns
- Reports unused event types
- Groups events by category (System, API, Deals, etc.)
- Checks for duplicate event type constants

**Total Event Types: 27**

**Run:**
```bash
npx tsx test/coverage.test.ts
```

**Expected Output:**
```
Coverage: 27/27 events (100.0%)
✅ SUCCESS: All event types are being used in codebase!
```

## Quality Gates

### Type Check
```bash
npm run typecheck
```

### Build
```bash
npm run build
```

## Event Categories

| Category | Events | Status |
|----------|---------|--------|
| System | 3 | ✅ |
| API | 3 | ✅ |
| Deals | 4 | ✅ |
| Notifications | 3 | ✅ |
| Users | 4 | ✅ |
| Database | 3 | ✅ |
| Jobs | 3 | ✅ |
| Errors | 4 | ✅ |
| **Total** | **27** | **✅** |

## What Gets Validated

### Architecture
- ✅ Axiom package imports
- ✅ Logger configuration
- ✅ Environment variables
- ✅ Transport setup (Axiom + Console)

### Type Safety
- ✅ BaseEvent interface/schema
- ✅ EventContext interface/schema
- ✅ WideEvent union type
- ✅ Zod validation schemas
- ✅ Parse functions

### Functionality
- ✅ Log methods (info, warn, error, debug)
- ✅ flushLogs for graceful shutdown
- ✅ Field enrichment
- ✅ Correlation ID generation
- ✅ Context-aware logging

### Trackers
- ✅ createApiCallTracker
- ✅ createDealTracker
- ✅ createNotificationTracker
- ✅ createBatchTracker
- ✅ createJobTracker
- ✅ createUserActionTracker
- ✅ createDbQueryTracker

### Error Handling
- ✅ logError
- ✅ logValidationError
- ✅ logNetworkError
- ✅ logDatabaseError
- ✅ createErrorLogger
- ✅ wrapWithErrorLogging

### Integration
- ✅ Application lifecycle (startup, shutdown)
- ✅ Health check endpoint
- ✅ Global error handlers
- ✅ Bot commands
- ✅ Bot callbacks
- ✅ API calls
- ✅ Deal processing
- ✅ Notifications
- ✅ Job execution

## Test Results Summary

```
VALIDATION TEST SUITE
├─────────────────────────────────────────────────────────────────
Total Checks:          74
Passed:                74
Failed:                0
Success Rate:          100.0%
└─────────────────────────────────────────────────────────────────

EVENT COVERAGE
├─────────────────────────────────────────────────────────────────
Total Event Types:     27
Used Events:           27
Unused Events:         0
Coverage:              100.0%
└─────────────────────────────────────────────────────────────────

QUALITY GATES
├─────────────────────────────────────────────────────────────────
Type Check:            ✅ PASSED
Build:                 ✅ PASSED
└─────────────────────────────────────────────────────────────────
```

## Continuous Validation

These tests should be run:

1. **Before Deployment** - Ensure all logging is intact
2. **After Changes** - Verify new event types are integrated
3. **Code Review** - Validate logging completeness

## Manual Verification Steps

After automated tests pass, manually verify:

1. **Axiom Connection**
   ```bash
   # Ensure AXIOM_TOKEN is set
   echo $AXIOM_TOKEN
   ```

2. **Event Flow**
   - Start the application: `npm run dev`
   - Trigger /start command
   - Check Axiom UI for `app.startup` and `user.created` events

3. **Latency Check**
   - Monitor event timestamps in Axiom
   - Verify <100ms overhead on P95

4. **Blocking Behavior**
   - Trigger many events in quick succession
   - Verify application remains responsive

5. **Graceful Shutdown**
   - Stop application (Ctrl+C)
   - Check for `app.shutdown` event in Axiom

## Troubleshooting

### Test Fails on "Event Types import"
- Check: Event types defined in `src/utils/eventTypes.ts`
- Check: Event types match constants

### Test Fails on "logger not imported"
- Check: File imports from `../utils/logger.js` or similar path
- Check: Import statement uses `.js` extension

### Test Fails on "Axiom import"
- Check: `@axiomhq/logging` in package.json dependencies
- Check: `src/config/axiom.ts` imports from Axiom

## Documentation

See `docs/LOGGING_VALIDATION.md` for:
- Detailed validation report
- Acceptance criteria status
- Architecture validation
- Manual setup steps
- Recommendations
