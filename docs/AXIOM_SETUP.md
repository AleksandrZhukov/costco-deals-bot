# Axiom Dashboards and Alerts Setup Guide

This guide walks you through setting up Axiom dashboards and alerts for the YEP Savings Deal Bot.

## Prerequisites

- Axiom account ([sign up](https://axiom.co))
- API token with "Ingest" and "Query" permissions
- Dataset configured with logs flowing

## Table of Contents

1. [Dataset Configuration](#dataset-configuration)
2. [Importing Dashboards](#importing-dashboards)
3. [Setting Up Alerts](#setting-up-alerts)
4. [Notification Channels](#notification-channels)
5. [Maintenance Windows](#maintenance-windows)
6. [Verification](#verification)

---

## Dataset Configuration

### Set Retention Policy

1. Go to **Settings** → **Datasets**
2. Select your dataset: `costco-deals-bot`
3. Configure retention:
   - **Hot storage**: 7 days (fast querying, real-time)
   - **Warm storage**: 30 days (slower, lower cost)
4. Save changes

### Verify Data Flow

Before setting up dashboards, verify logs are flowing:

```apl
costco-deals-bot
| sort by _time desc
| limit 10
```

If you see events, proceed to dashboard setup.

---

## Importing Dashboards

### Operations Dashboard

1. In Axiom UI, go to **Dashboards** → **Create Dashboard**
2. Click **Import** (or use the API)
3. Copy and paste the contents of `docs/axiom/operations-dashboard.json`
4. Name the dashboard: `Operations Dashboard`
5. Click **Import**

### Business Metrics Dashboard

1. Go to **Dashboards** → **Create Dashboard**
2. Click **Import**
3. Copy and paste the contents of `docs/axiom/business-dashboard.json`
4. Name the dashboard: `Business Metrics Dashboard`
5. Click **Import**

### Performance Dashboard

1. Go to **Dashboards** → **Create Dashboard**
2. Click **Import**
3. Copy and paste the contents of `docs/axiom/performance-dashboard.json`
4. Name the dashboard: `Performance Dashboard`
5. Click **Import**

### Manual Setup (Alternative)

If import doesn't work, manually create each query:

1. Create a new dashboard
2. For each query in the JSON:
   - Click **Add Query**
   - Copy the `query` field into the query editor
   - Select the appropriate visualization type
   - Set the title from the JSON

---

## Setting Up Alerts

### Alert Configuration Files

Alerts are defined in the following files:

- `docs/axiom/alerts/high-error-rate.json`
- `docs/axiom/alerts/api-latency.json`
- `docs/axiom/alerts/job-failure.json`
- `docs/axiom/alerts/notification-failure-rate.json`
- `docs/axiom/alerts/api-failure-rate.json`

### Importing Alerts (Via API)

Use the Axiom API to import alerts:

```bash
# Get your API token from Axiom Settings
export AXIOM_TOKEN="your-api-token-here"

# Import high error rate alert
curl -X POST https://api.axiom.co/v1/datasets/costco-deals-bot/alerts \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d @docs/axiom/alerts/high-error-rate.json

# Import API latency alert
curl -X POST https://api.axiom.co/v1/datasets/costco-deals-bot/alerts \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d @docs/axiom/alerts/api-latency.json

# Import job failure alert
curl -X POST https://api.axiom.co/v1/datasets/costco-deals-bot/alerts \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d @docs/axiom/alerts/job-failure.json

# Import notification failure rate alert
curl -X POST https://api.axiom.co/v1/datasets/costco-deals-bot/alerts \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d @docs/axiom/alerts/notification-failure-rate.json

# Import API failure rate alert
curl -X POST https://api.axiom.co/v1/datasets/costco-deals-bot/alerts \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d @docs/axiom/alerts/api-failure-rate.json
```

### Manual Setup (Alternative)

1. Go to **Alerts** → **Create Alert**
2. Set the name and description from the JSON
3. Paste the query into the query editor
4. Configure:
   - **Condition**: Set threshold matching JSON
   - **Window**: Set time window (e.g., `5m`)
   - **Evaluation**: Set evaluation interval (e.g., `every 1m`)
5. Set up notification channels (see [Notification Channels](#notification-channels))
6. Enable recovery notifications
7. Save the alert

---

## Notification Channels

### Email Notifications

1. Go to **Settings** → **Notification Channels**
2. Click **Add Channel** → **Email**
3. Configure:
   - **Name**: `ops-email`
   - **Email addresses**: Add your team emails (comma-separated)
4. Test the channel
5. Save

### Slack Notifications

1. Go to **Settings** → **Notification Channels**
2. Click **Add Channel** → **Slack**
3. Configure:
   - **Name**: `ops-slack`
   - **Webhook URL**: Create an incoming webhook in Slack and paste the URL
   - **Channel**: Select which Slack channel to post to
4. Test the channel
5. Save

### Telegram Notifications (Optional)

If you prefer Telegram:

1. Create a Telegram bot via BotFather
2. Get the bot token
3. Set up a webhook server or use a notification service
4. Configure in Axiom as a custom webhook channel

---

## Maintenance Windows

### Configuring Maintenance Windows

To prevent alerts from firing during planned maintenance:

#### Option 1: Disable Alerts Manually

1. Go to **Alerts**
2. Select the alert you want to disable
3. Toggle **Enabled** to off
4. Re-enable after maintenance

#### Option 2: Use Axiom API

```bash
# Disable an alert during maintenance
curl -X PATCH https://api.axiom.co/v1/datasets/costco-deals-bot/alerts/{alert-id} \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Re-enable after maintenance
curl -X PATCH https://api.axiom.co/v1/datasets/costco-deals-bot/alerts/{alert-id} \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

#### Option 3: Add Maintenance Event

Log a maintenance event that alerts can filter on:

```typescript
// In your maintenance script
import { log } from './utils/logger.js';

log.info('maintenance.start', {
  maintenance_type: 'planned',
  start_time: new Date().toISOString(),
  expected_duration_minutes: 30,
});

// After maintenance
log.info('maintenance.end', {
  maintenance_type: 'planned',
  end_time: new Date().toISOString(),
});
```

Then update alert queries to exclude maintenance windows:

```apl
| where event_type != "maintenance.start"
```

---

## Verification

### Test Dashboards

1. Generate some test activity:
   ```bash
   # Run the bot and trigger some commands
   npm run dev
   
   # Or manually trigger the daily parse
   curl http://localhost:3000/daily-parse
   ```

2. Check each dashboard:
   - **Operations Dashboard**: Should show real-time metrics
   - **Business Dashboard**: Should show deal and notification counts
   - **Performance Dashboard**: Should show latency metrics

### Test Alerts

#### 1. Test High Error Rate Alert

Generate some errors:

```typescript
// In a test endpoint or script
import { log } from './utils/logger.js';
import { EventTypes } from './utils/eventTypes.js';

for (let i = 0; i < 15; i++) {
  log.error(EventTypes.ERROR_UNHANDLED, {
    error_message: `Test error ${i}`,
  });
}
```

Wait 5 minutes and verify alert fires.

#### 2. Test API Latency Alert

Add artificial delay to an API call temporarily:

```typescript
// In dealParser.ts, add temporary delay
await new Promise(resolve => setTimeout(resolve, 1500));
```

Trigger an API call and wait 1-2 minutes for alert.

#### 3. Test Job Failure Alert

Add an error to the daily parse job temporarily:

```typescript
// In dailyParser.ts
throw new Error('Test job failure');
```

Trigger the job and verify alert fires.

#### 4. Test Notification Failure Rate Alert

Disable your bot's Telegram token temporarily to cause failures:

```typescript
// In telegram.ts or env.ts
TELEGRAM_BOT_TOKEN = ''
```

Send some notifications and verify alert fires.

### Verify Dashboard Queries

Check each dashboard query returns data:

```apl
-- Operations Dashboard - Error Rate Over Time
costco-deals-bot
| where event_type in ["error.unhandled", "error.validation", "error.network", "error.database"]
| bin _time 5m
| summarize count() by _time, event_type

-- Business Dashboard - Deals Processed Per Day
costco-deals-bot
| where event_type == "processing.batch_complete"
| bin _time 1d
| summarize sum(deals_processed) by _time

-- Performance Dashboard - API Response Times
costco-deals-bot
| where event_type == "yep.api.success"
| summarize p50(duration_ms), p95(duration_ms), p99(duration_ms)
```

### Check Alert Status

1. Go to **Alerts** in Axiom UI
2. Verify each alert:
   - ✅ Status is "Enabled"
   - ✅ Last evaluation time is recent
   - ✅ Notification channels are configured
   - ✅ Threshold values are correct

---

## Dashboard Descriptions

### Operations Dashboard

**Purpose**: Monitor real-time system health and operational metrics

**Key Metrics**:
- Error rate over time (by error type)
- API success/failure ratio
- API response time trend (last hour)
- Recent errors (table view)
- Job execution history
- Failed jobs
- Notification success rate
- System uptime

**Refresh Rate**: 1 minute

**When to Check**: Daily operations, when investigating issues

---

### Business Metrics Dashboard

**Purpose**: Track business KPIs and user engagement

**Key Metrics**:
- Deals processed per day
- New deals detected per day
- Notifications sent per day
- Top stores by activity
- User command distribution
- Most active users (last 24h)
- Users by store preference
- New users today
- Batch notification success rate
- Deals with high discount (>50%)

**Refresh Rate**: 5 minutes

**When to Check**: Weekly business reviews, tracking growth

---

### Performance Dashboard

**Purpose**: Monitor system performance and identify bottlenecks

**Key Metrics**:
- API response times (p50, p95, p99)
- API response time trend
- Deal processing duration distribution
- Slow individual deal processing (>1 second)
- Database query times
- Slow queries (>1 second)
- Most frequent slow queries
- Job execution duration
- Notification performance
- Log volume over time

**Refresh Rate**: 2 minutes

**When to Check**: Performance reviews, when investigating slowness

---

## Alert Thresholds

### Critical Alerts (Immediate Action Required)

| Alert | Threshold | Window | Action |
|-------|-----------|--------|--------|
| Job Failure | Any failure | 5 minutes | Investigate job logs, restart if needed |
| High Error Rate | >10 errors | 5 minutes | Check recent errors, identify root cause |
| API Failure Rate | >10% failures | 1 minute | Check API connectivity, service status |

### Warning Alerts (Monitor Closely)

| Alert | Threshold | Window | Action |
|-------|-----------|--------|--------|
| API Latency | >5 slow requests | 5 minutes | Monitor, investigate if trend continues |
| Notification Failure Rate | >50% failed | 10 minutes | Check bot connectivity, rate limits |

---

## Troubleshooting

### Dashboards Not Showing Data

1. **Check logs are flowing**:
   ```apl
   costco-deals-bot
   | sort by _time desc
   | limit 10
   ```

2. **Verify dataset name**: Should be `costco-deals-bot`

3. **Check time range**: Dashboard time range may exclude recent data

4. **Verify query syntax**: Test each query in the query editor

### Alerts Not Firing

1. **Check alert is enabled**: Go to **Alerts** and verify status

2. **Verify threshold**: Check if threshold was actually crossed

3. **Check evaluation window**: Ensure enough time has passed

4. **Test notification channel**: Send a test notification from channel settings

5. **Check query results**: Manually run the alert query to see results

### Too Many Alert Notifications

1. **Adjust thresholds**: Make thresholds more conservative

2. **Increase evaluation window**: Evaluate less frequently

3. **Enable recovery notifications**: Only notify when issue is resolved

4. **Set up alert grouping**: Group similar alerts together

### Dashboard Performance Issues

1. **Reduce time range**: Query smaller time windows

2. **Optimize queries**: Use more specific filters

3. **Increase refresh interval**: Refresh less frequently

4. **Add indexes**: If applicable for your dataset

---

## Best Practices

### 1. Regular Review

- **Weekly**: Review dashboards for trends
- **Monthly**: Adjust alert thresholds based on data
- **Quarterly**: Update dashboards for new metrics

### 2. Alert Fatigue Prevention

- Only set critical alerts for issues requiring immediate action
- Use warning alerts for issues to monitor
- Disable alerts during planned maintenance
- Review and disable unused alerts

### 3. Continuous Improvement

- Add new metrics as features are added
- Remove obsolete metrics
- Adjust thresholds based on actual usage patterns
- Share dashboards with team for visibility

### 4. Documentation

- Keep dashboard definitions in version control
- Document any custom queries or thresholds
- Maintain a runbook for common alert responses

---

## Next Steps

1. ✅ Configure dataset retention (7 days hot, 30 days warm)
2. ✅ Import dashboards (Operations, Business, Performance)
3. ✅ Set up alerts (5 critical alerts configured)
4. ✅ Configure notification channels (Email, Slack)
5. ✅ Test alerts and verify dashboards
6. 📊 Review dashboards regularly
7. 🔔 Adjust alert thresholds based on usage
8. 📈 Add new metrics as needed

---

## Additional Resources

- [Axiom Documentation](https://axiom.co/docs)
- [Axiom Query Language (APL)](https://axiom.co/docs/apl)
- [LOGGING.md](./LOGGING.md) - Logging implementation guide
- [AXIOM_QUERIES.md](./AXIOM_QUERIES.md) - Query examples
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment instructions

---

## Support

For issues with:
- **Axiom platform**: Contact Axiom support
- **Dashboard queries**: See [AXIOM_QUERIES.md](./AXIOM_QUERIES.md)
- **Alert configuration**: Check this guide
- **Application logging**: See [LOGGING.md](./LOGGING.md)
