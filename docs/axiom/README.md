# Axiom Configuration Files

This directory contains JSON configuration files for Axiom dashboards and alerts.

## Directory Structure

```
docs/axiom/
├── operations-dashboard.json
├── business-dashboard.json
├── performance-dashboard.json
├── alerts/
│   ├── high-error-rate.json
│   ├── api-latency.json
│   ├── job-failure.json
│   ├── notification-failure-rate.json
│   └── api-failure-rate.json
└── README.md (this file)
```

## Dashboards

### Operations Dashboard

**File**: `operations-dashboard.json`

**Purpose**: Monitor real-time system health and operational metrics

**Key Features**:
- Error rate over time (by error type)
- API success/failure ratio
- API response time trend (last hour)
- Recent errors (table view)
- Job execution history
- Failed jobs
- Notification success rate
- System uptime

**Refresh Rate**: 1 minute

**Use Cases**:
- Daily operations monitoring
- Real-time issue detection
- System health checks

---

### Business Metrics Dashboard

**File**: `business-dashboard.json`

**Purpose**: Track business KPIs and user engagement

**Key Features**:
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

**Use Cases**:
- Weekly business reviews
- Tracking user growth
- Identifying popular stores

---

### Performance Dashboard

**File**: `performance-dashboard.json`

**Purpose**: Monitor system performance and identify bottlenecks

**Key Features**:
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

**Use Cases**:
- Performance reviews
- Investigating slowness
- Capacity planning

---

## Alerts

### High Error Rate Alert

**File**: `alerts/high-error-rate.json`

**Trigger**: >10 errors in 5 minutes

**Severity**: Critical

**Query**:
```apl
costco-deals-bot
| where event_type in ["error.unhandled", "error.validation", "error.network", "error.database"]
  and _time > now() - 5m
| summarize error_count = count()
| where error_count > 10
```

**Action Required**:
1. Check recent errors in Axiom
2. Identify error type and root cause
3. Fix the issue or mitigate the problem

---

### API Latency Alert

**File**: `alerts/api-latency.json`

**Trigger**: >5 slow API requests (>1s) in 5 minutes

**Severity**: Warning

**Query**:
```apl
costco-deals-bot
| where event_type == "yep.api.success"
  and duration_ms > 1000
  and _time > now() - 5m
| summarize count() as slow_count
| where slow_count > 5
```

**Action Required**:
1. Check YEP API status
2. Monitor if latency continues
3. Consider implementing caching if persistent

---

### Job Failure Alert

**File**: `alerts/job-failure.json`

**Trigger**: Any job failure

**Severity**: Critical

**Query**:
```apl
costco-deals-bot
| where event_type == "job.daily_parse.error"
| where _time > now() - 5m
```

**Action Required**:
1. Check job logs for error details
2. Investigate root cause
3. Restart job manually if needed
4. Fix underlying issue

---

### Notification Failure Rate Alert

**File**: `alerts/notification-failure-rate.json`

**Trigger**: >50% notification failures in 10 minutes

**Severity**: Warning

**Query**:
```apl
costco-deals-bot
| where event_type == "notification.batch_complete"
  and failure_count / total_notifications > 0.5
  and _time > now() - 10m
```

**Action Required**:
1. Check Telegram bot token
2. Verify Telegram API status
3. Check rate limits
4. Review user-specific failures

---

### API Failure Rate Alert

**File**: `alerts/api-failure-rate.json`

**Trigger**: >10% API failures in 1 minute

**Severity**: Critical

**Query**:
```apl
costco-deals-bot
| where event_type in ["yep.api.success", "yep.api.error"]
  and _time > now() - 1m
| summarize failure_rate = count_if(event_type == "yep.api.error") / count() * 100
| where failure_rate > 10
```

**Action Required**:
1. Check YEP API status
2. Verify API connectivity
3. Check API cookie/token
4. Monitor for persistent issues

---

## Importing Configurations

### Using the Setup Script (Recommended)

```bash
# Set your Axiom API token
export AXIOM_TOKEN=xaat-your-token-here

# Run the setup script
./scripts/setup-axiom.sh
```

This will automatically import all dashboards and alerts.

### Using Axiom UI

1. **For Dashboards**:
   - Go to Dashboards → Create Dashboard
   - Click Import
   - Paste JSON content
   - Click Import

2. **For Alerts**:
   - Go to Alerts → Create Alert
   - Configure query from JSON
   - Set thresholds and notification channels
   - Save

### Using Axiom API

```bash
# Import a dashboard
curl -X POST https://api.axiom.co/v1/datasets/costco-deals-bot/dashboards \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d @docs/axiom/operations-dashboard.json

# Import an alert
curl -X POST https://api.axiom.co/v1/datasets/costco-deals-bot/alerts \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d @docs/axiom/alerts/high-error-rate.json
```

---

## Customizing Configurations

### Modifying Alert Thresholds

Edit the relevant alert JSON file:

```json
{
  "threshold": {
    "type": "absolute",
    "value": 20,  // Change from 10 to 20
    "operator": "greater_than"
  }
}
```

### Adding New Metrics to Dashboards

Edit the dashboard JSON and add to the `queries` array:

```json
{
  "title": "Your New Metric",
  "type": "line",
  "query": "costco-deals-bot\n| where event_type == \"your.event.type\"",
  "visualization": {
    "xAxis": "_time",
    "yAxis": "count"
  }
}
```

### Creating Custom Alerts

1. Copy an existing alert file as a template
2. Update:
   - `name`
   - `description`
   - `query`
   - `threshold`
   - `notification.message`
3. Import using the setup script or API

---

## Dashboard JSON Schema

```json
{
  "name": "Dashboard Name",
  "description": "Dashboard description",
  "dataset": "costco-deals-bot",
  "queries": [
    {
      "title": "Query Title",
      "type": "line|bar|pie|table|gauge",
      "query": "APL query string",
      "visualization": {
        "xAxis": "field_name",
        "yAxis": "field_name",
        "series": ["field1", "field2"],
        "label": "Axis label"
      }
    }
  ],
  "refresh": "1m|2m|5m"
}
```

**Visualization Types**:
- `line` - Time series charts
- `bar` - Bar charts
- `pie` - Pie charts
- `table` - Data tables
- `gauge` - Single value gauges

---

## Alert JSON Schema

```json
{
  "name": "Alert Name",
  "description": "Alert description",
  "enabled": true,
  "dataset": "costco-deals-bot",
  "query": "APL query string",
  "condition": "field operator value",
  "threshold": {
    "type": "absolute|percentage",
    "value": 10,
    "operator": "greater_than|less_than|equals"
  },
  "window": "5m|10m|1h",
  "evaluation": "every 1m|every 30s",
  "notification": {
    "channels": ["email", "slack"],
    "message": "Alert message with {{placeholders}}",
    "severity": "critical|warning|info"
  },
  "recovery": {
    "enabled": true,
    "message": "Recovery message",
    "window": "10m"
  }
}
```

---

## Testing

### Test Dashboards

1. Generate test activity:
   ```bash
   npm run dev
   # Trigger some commands in Telegram
   ```

2. Verify data appears in dashboards

3. Check all visualizations render correctly

### Test Alerts

1. Temporarily modify alert thresholds to very low values
2. Generate matching events
3. Verify alerts fire
4. Check notifications are received
5. Restore original thresholds

---

## Troubleshooting

### Import Fails

- **Error**: "Dataset not found"
  - **Solution**: Create dataset first in Axiom UI

- **Error**: "Unauthorized"
  - **Solution**: Check `AXIOM_TOKEN` is valid and has proper permissions

- **Error**: "Invalid JSON"
  - **Solution**: Validate JSON using a linter or online validator

### Dashboards Show No Data

- **Check**: Logs are flowing to Axiom
- **Check**: Dataset name is correct (`costco-deals-bot`)
- **Check**: Time range includes recent data
- **Check**: Query syntax is correct (test in Axiom UI)

### Alerts Not Firing

- **Check**: Alert is enabled
- **Check**: Threshold is actually being crossed
- **Check**: Evaluation window has elapsed
- **Check**: Notification channels are configured
- **Check**: Query returns results when run manually

---

## Maintenance

### Regular Tasks

**Weekly**:
- Review dashboards for data quality
- Check alert effectiveness
- Monitor false positive rate

**Monthly**:
- Adjust alert thresholds based on usage
- Add new metrics as features are added
- Remove obsolete alerts

**Quarterly**:
- Review dashboard usage
- Optimize slow queries
- Update documentation

### Updating Configurations

1. Edit JSON files in this directory
2. Test changes in Axiom UI dev mode
3. Commit changes to version control
4. Re-import using setup script

---

## Related Documentation

- [AXIOM_SETUP.md](../AXIOM_SETUP.md) - Complete setup guide
- [LOGGING.md](../LOGGING.md) - Logging implementation
- [AXIOM_QUERIES.md](../AXIOM_QUERIES.md) - Query examples
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment guide

---

## Support

For issues with:
- **Axiom platform**: Contact Axiom support
- **Dashboard/Alert JSON**: Check this README
- **Application logging**: See [LOGGING.md](../LOGGING.md)
- **APL queries**: See [AXIOM_QUERIES.md](../AXIOM_QUERIES.md)
