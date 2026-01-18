# Axiom Query Examples

This guide provides common Axiom queries for debugging and monitoring the YEP Savings Deal Bot.

## Query Syntax Basics

Axiom uses APL (Axiom Processing Language) for queries. Basic syntax:

```
dataset | where event_type == "your.event.type" | sort by _time desc
```

Common operators:
- `==`, `!=` : Equality
- `>`, `<`, `>=`, `<=` : Comparison
- `and`, `or` : Logical
- `contains`, `!contains` : String matching
- `in`, `!in` : List matching

## Quick Queries

### Recent Errors
```
costco-deals-bot
| where event_type in ["error.unhandled", "error.validation", "error.network", "error.database"]
| sort by _time desc
| limit 50
```

### Recent User Commands
```
costco-deals-bot
| where event_type == "user.command"
| sort by _time desc
| project user_id, command, _time
```

### API Calls in Last Hour
```
costco-deals-bot
| where event_type in ["yep.api.request", "yep.api.success", "yep.api.error"]
  and _time > now() - 1h
| sort by _time desc
```

### Job Execution Status
```
costco-deals-bot
| where event_type =~ "job.daily_parse.*"
| sort by _time desc
| limit 20
```

## Error Analysis

### All Errors by Type
```
costco-deals-bot
| where event_type in ["error.unhandled", "error.validation", "error.network", "error.database"]
| summarize count() by event_type
```

### Errors for Specific User
```
costco-deals-bot
| where event_type in ["error.unhandled", "error.validation", "error.network", "error.database"]
  and user_id == 123456789
| sort by _time desc
```

### Error Rate Over Time
```
costco-deals-bot
| where event_type in ["error.unhandled", "error.validation", "error.network", "error.database"]
| bin _time 5m
| summarize count() by _time, event_type
| sort by _time desc
```

### Top Error Messages
```
costco-deals-bot
| where event_type in ["error.unhandled", "error.validation", "error.network", "error.database"]
| summarize count() by error_message
| sort by count desc
| limit 10
```

### Database Errors with Query Names
```
costco-deals-bot
| where event_type == "error.database"
| project _time, error_message, query_name, fn_name
| sort by _time desc
```

### Errors in Last 15 Minutes
```
costco-deals-bot
| where event_type in ["error.unhandled", "error.validation", "error.network", "error.database"]
  and _time > now() - 15m
| sort by _time desc
```

## API Monitoring

### API Success Rate
```
costco-deals-bot
| where event_type in ["yep.api.success", "yep.api.error"]
| summarize count() by event_type
```

### Slow API Calls (>5 seconds)
```
costco-deals-bot
| where event_type == "yep.api.success"
  and duration_ms > 5000
| project store_id, page, duration_ms, deals_count, _time
| sort by duration_ms desc
```

### API Response Time Distribution
```
costco-deals-bot
| where event_type == "yep.api.success"
| summarize
    p50(duration_ms),
    p95(duration_ms),
    p99(duration_ms)
```

### API Errors by Store
```
costco-deals-bot
| where event_type == "yep.api.error"
| summarize count() by store_id
| sort by count desc
```

### API Response Time Trend (Last Hour)
```
costco-deals-bot
| where event_type == "yep.api.success"
  and _time > now() - 1h
| bin _time 5m
| summarize avg(duration_ms) by _time
| sort by _time desc
```

### Zero Deal Responses
```
costco-deals-bot
| where event_type == "yep.api.success"
  and deals_count == 0
| project store_id, page, _time
| sort by _time desc
```

## Deal Processing

### Deals Processed per Store
```
costco-deals-bot
| where event_type == "processing.batch_complete"
| project store_id, deals_processed, products_created, products_updated
| sort by deals_processed desc
```

### Deal Processing Performance
```
costco-deals-bot
| where event_type == "processing.batch_complete"
| summarize
    avg(avg_processing_time_ms),
    p50(avg_processing_time_ms),
    p95(avg_processing_time_ms),
    p99(avg_processing_time_ms)
```

### Failed Deal Processing
```
costco-deals-bot
| where event_type == "deal.processed"
  and created == false
  and updated == false
| project deal_id, store_id, product_upc, _time
| sort by _time desc
```

### New Deals Created Today
```
costco-deals-bot
| where event_type == "deal.processed"
  and created == true
  and _time > now() - 1d
| summarize count() by store_id
| sort by count desc
```

### Deals with High Discount (>50%)
```
costco-deals-bot
| where event_type == "deal.processed"
  and discount_percentage > 50
| project deal_id, product_upc, store_id, discount_percentage, current_price, _time
| sort by discount_percentage desc
```

### Slow Individual Deal Processing (>1 second)
```
costco-deals-bot
| where event_type == "deal.processed"
  and processing_duration_ms > 1000
| project deal_id, product_upc, store_id, processing_duration_ms, _time
| sort by processing_duration_ms desc
```

### Batch Processing History
```
costco-deals-bot
| where event_type == "processing.batch_complete"
| sort by _time desc
| limit 20
| project store_id, deals_processed, products_created, deals_created, deals_updated, duration_ms, _time
```

## Notification Monitoring

### Notification Success Rate
```
costco-deals-bot
| where event_type in ["notification.sent", "notification.failed"]
| summarize count() by event_type
```

### Failed Notifications by User
```
costco-deals-bot
| where event_type == "notification.failed"
| summarize count() by user_id
| sort by count desc
```

### Notifications Sent Today
```
costco-deals-bot
| where event_type == "notification.batch_complete"
  and _time > now() - 1d
| summarize sum(success_count) as total_sent
```

### Notification Performance
```
costco-deals-bot
| where event_type == "notification.batch_complete"
| summarize
    avg(duration_ms),
    min(duration_ms),
    max(duration_ms)
```

### Batch Notification Failures
```
costco-deals-bot
| where event_type == "notification.batch_complete"
  and failure_count > 0
| project total_notifications, success_count, failure_count, _time
| sort by failure_count desc
```

### Notifications by Store
```
costco-deals-bot
| where event_type == "notification.sent"
| summarize count() by store_id
| sort by count desc
```

## User Activity

### Most Active Users (Last 24h)
```
costco-deals-bot
| where event_type in ["user.command", "user.callback"]
  and _time > now() - 24h
| summarize count() by user_id
| sort by count desc
| limit 20
```

### User Command Distribution
```
costco-deals-bot
| where event_type == "user.command"
| summarize count() by command
| sort by count desc
```

### New Users Today
```
costco-deals-bot
| where event_type == "user.created"
  and _time > now() - 1d
| project user_id, _time
```

### User Settings Changes
```
costco-deals-bot
| where event_type == "user.settings_changed"
| sort by _time desc
| project user_id, setting, old_value, new_value, _time
```

### Favorites Added Today
```
costco-deals-bot
| where event_type == "user.callback"
  and callback_action == "favorite"
  and _time > now() - 1d
| project user_id, deal_id, _time
```

### Users by Store Preference
```
costco-deals-bot
| where event_type == "user.command"
| summarize count_distinct(user_id) by store_id
| sort by count_distinct desc
```

## Database Performance

### Slow Queries (>1 second)
```
costco-deals-bot
| where event_type == "db.query"
  and slow_query == true
  and duration_ms > 1000
| project query_name, duration_ms, threshold_ms, frequency, _time
| sort by duration_ms desc
```

### Most Frequent Slow Queries
```
costco-deals-bot
| where event_type == "db.query"
  and slow_query == true
| summarize count(), avg(duration_ms) by query_name
| sort by count desc
| limit 10
```

### Database Errors
```
costco-deals-bot
| where event_type == "db.error"
| project _time, error_message, query_name
| sort by _time desc
```

### Query Performance Distribution
```
costco-deals-bot
| where event_type == "db.query"
| summarize
    avg(duration_ms),
    p50(duration_ms),
    p95(duration_ms),
    p99(duration_ms)
```

### Migrations Run
```
costco-deals-bot
| where event_type == "db.migration"
| sort by _time desc
```

## Job Monitoring

### Job Execution History
```
costco-deals-bot
| where event_type =~ "job.daily_parse.*"
| sort by _time desc
| project event_type, manual_trigger, stores_count, deals_processed, new_deals_found, duration_ms, _time
```

### Failed Jobs
```
costco-deals-bot
| where event_type == "job.daily_parse.error"
| sort by _time desc
| project stores_count, deals_processed, error_message, duration_ms, _time
```

### Job Performance Trend
```
costco-deals-bot
| where event_type == "job.daily_parse.complete"
| bin _time 1d
| summarize avg(duration_ms) by _time
| sort by _time desc
```

### Deals Found per Job
```
costco-deals-bot
| where event_type == "job.daily_parse.complete"
| project _time, deals_processed, new_deals_found
| sort by _time desc
```

### Manual vs Scheduled Jobs
```
costco-deals-bot
| where event_type == "job.daily_parse.start"
| summarize count() by manual_trigger
```

## Health & System

### Startup/Shutdown Events
```
costco-deals-bot
| where event_type in ["app.startup", "app.shutdown"]
| project event_type, _time, signal, webhook_mode
| sort by _time desc
```

### Health Check Response Time
```
costco-deals-bot
| where event_type == "health.check"
| summarize avg(duration_ms)
```

### Application Uptime
```
costco-deals-bot
| where event_type in ["app.startup", "app.shutdown"]
| sort by _time desc
| project event_type, _time
```

## Advanced Queries

### Correlated Error Flows (by correlation_id)
```
costco-deals-bot
| where correlation_id == "1737151234567-abc123"
| sort by _time asc
```

### All Events for a Specific User
```
costco-deals-bot
| where user_id == 123456789
| sort by _time desc
```

### All Events for a Specific Deal
```
costco-deals-bot
| where deal_id == "deal-123"
| sort by _time asc
```

### Time-series: Error Rate (Last 24h)
```
costco-deals-bot
| where event_type in ["error.unhandled", "error.validation", "error.network", "error.database"]
  and _time > now() - 24h
| bin _time 1h
| summarize count() by _time
| sort by _time desc
```

### Time-series: API Response Time (Last 24h)
```
costco-deals-bot
| where event_type == "yep.api.success"
  and _time > now() - 24h
| bin _time 1h
| summarize avg(duration_ms) by _time
| sort by _time desc
```

### Time-series: Daily Deals Processed (Last 7 days)
```
costco-deals-bot
| where event_type == "processing.batch_complete"
  and _time > now() - 7d
| bin _time 1d
| summarize sum(deals_processed) by _time
| sort by _time desc
```

### Complex: Store Performance Summary
```
costco-deals-bot
| where event_type in ["processing.batch_complete", "yep.api.success"]
| summarize
    count_deals = count_if(event_type == "processing.batch_complete"),
    sum_deals = sum_if(deals_processed, event_type == "processing.batch_complete"),
    avg_api_duration = avg_if(duration_ms, event_type == "yep.api.success")
  by store_id
| sort by sum_deals desc
```

### Find Users with High Failure Rate
```
costco-deals-bot
| where event_type in ["notification.sent", "notification.failed"]
| summarize
    sent = count_if(event_type == "notification.sent"),
    failed = count_if(event_type == "notification.failed"),
    failure_rate = count_if(event_type == "notification.failed") / count() * 100
  by user_id
| where failed > 0 and failure_rate > 50
| sort by failure_rate desc
```

## Dashboard Queries

### Operations Dashboard

#### Error Rate Over Time
```
costco-deals-bot
| where event_type in ["error.unhandled", "error.validation", "error.network", "error.database"]
| bin _time 5m
| summarize count() by _time, event_type
```

#### API Success/Failure Ratio
```
costco-deals-bot
| where event_type in ["yep.api.success", "yep.api.error"]
| summarize count() by event_type
```

#### Job Status
```
costco-deals-bot
| where event_type =~ "job.daily_parse.*"
| sort by _time desc
| limit 10
```

### Business Metrics Dashboard

#### Deals Processed Per Day
```
costco-deals-bot
| where event_type == "processing.batch_complete"
| bin _time 1d
| summarize sum(deals_processed) by _time
| sort by _time desc
```

#### New Deals Detected Per Day
```
costco-deals-bot
| where event_type == "deal.processed"
  and created == true
| bin _time 1d
| summarize count() by _time
| sort by _time desc
```

#### Notifications Sent Per Day
```
costco-deals-bot
| where event_type == "notification.sent"
| bin _time 1d
| summarize count() by _time
| sort by _time desc
```

#### Top Stores by Activity
```
costco-deals-bot
| where event_type == "processing.batch_complete"
| summarize sum(deals_processed) by store_id
| sort by sum desc
| limit 10
```

### Performance Dashboard

#### API Response Times (p50, p95, p99)
```
costco-deals-bot
| where event_type == "yep.api.success"
| summarize
    p50(duration_ms),
    p95(duration_ms),
    p99(duration_ms)
```

#### Deal Processing Duration Distribution
```
costco-deals-bot
| where event_type == "deal.processed"
| summarize
    avg(processing_duration_ms),
    p50(processing_duration_ms),
    p95(processing_duration_ms),
    p99(processing_duration_ms)
```

#### Database Query Times
```
costco-deals-bot
| where event_type == "db.query"
| summarize
    avg(duration_ms),
    p95(duration_ms),
    count_if(slow_query == true) as slow_query_count
```

## Alert Queries

### High Error Rate Alert
```
costco-deals-bot
| where event_type in ["error.unhandled", "error.validation", "error.network", "error.database"]
  and _time > now() - 5m
| summarize count() as error_count
| where error_count > 10
```

### API Failure Rate Alert
```
costco-deals-bot
| where event_type == "yep.api.error"
  and _time > now() - 1m
| summarize count() as error_count
| where error_count > 5
```

### Job Failure Alert
```
costco-deals-bot
| where event_type == "job.daily_parse.error"
| where _time > now() - 5m
```

### Notification Failure Rate Alert
```
costco-deals-bot
| where event_type == "notification.batch_complete"
  and failure_count / total_notifications > 0.5
  and _time > now() - 10m
```

### Slow API Response Alert
```
costco-deals-bot
| where event_type == "yep.api.success"
  and duration_ms > 5000
  and _time > now() - 5m
| count()
| where count > 5
```

## Troubleshooting Queries

### Find What User Did Before Error
```
costco-deals-bot
| where user_id == 123456789
  and _time > now() - 1h
| sort by _time desc
| limit 50
```

### Trace Deal Lifecycle
```
costco-deals-bot
| where deal_id == "deal-123"
| project event_type, _time, store_id, product_upc
| sort by _time asc
```

### API Errors with Context
```
costco-deals-bot
| where event_type == "yep.api.error"
| sort by _time desc
| limit 20
| project store_id, page, error_message, duration_ms, _time
```

### Find All Events in a Time Window
```
costco-deals-bot
| where _time > "2026-01-18T10:00:00Z"
  and _time < "2026-01-18T11:00:00Z"
| sort by _time asc
```

## Tips for Writing Queries

### Use Wildcards for Related Events
```
| where event_type =~ "job.daily_parse.*"
```

### Filter by Time Range
```
| where _time > now() - 1h
| where _time > "2026-01-18T00:00:00Z"
```

### Use Binning for Time-Series
```
| bin _time 5m
| bin _time 1h
| bin _time 1d
```

### Aggregate Multiple Metrics
```
| summarize count(), avg(duration_ms), p95(duration_ms)
```

### Sort Results
```
| sort by _time desc
| sort by count desc
| sort by duration_ms desc
```

### Limit Results
```
| limit 10
| limit 50
```

### Project Specific Fields
```
| project user_id, command, _time
```

## Resources

- [Axiom Query Language Docs](https://axiom.co/docs/apl)
- [LOGGING.md](./LOGGING.md) - Logging guide
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Setup instructions
