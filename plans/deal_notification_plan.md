# Deal Notifications Implementation Plan

## Overview

This plan outlines adding automatic deal notifications to the deal bot - daily digests and instant notifications for favorite deals that reappear.

## Current State

- Users must manually run `/deals` to see deals
- Daily parsing runs but sends 0 notifications  
- `newDeals` array exists but is unused
- `sendDealNotification()` function exists but is unused

## Requirements

### 1. Daily Digest

- **Recipients**: Users with `notificationsEnabled = true`
- **Content**: Active deals for user's store that are:
  - NOT hidden by user
  - NOT favorited by user  
  - NOT already sent in digest
- **Format**: 10 deals at a time with "Show More" pagination
- **Frequency**: Once per day after parsing

### 2. Instant Notifications for Favorite Deals

- **Trigger**: When favorited deal reappears (`isNewDeal = true`)
- **Recipients**: Users who favorited that deal
- **Filters**: Skip if user has hidden the deal
- **Rate limiting**: 1.5 second delay between users
- **Deduplication**: Record in digest history

### 3. Brand New Deals

- Go to daily digest only, NOT instant notification

## Files to Create

1. `drizzle/0002_add_user_digest_history.sql` - Migration for digest history table
2. `src/services/digestService.ts` - Digest generation and sending logic
3. `src/bot/handlers/digestCallbackHandler.ts` - Handle "Show More" button for digests

## Files to Modify

1. `src/database/schema.ts` - Add `userDigestHistory` table and relations
2. `src/database/queries.ts` - Add digest-related query functions
3. `src/schedulers/dailyParser.ts` - Send instant fav notifications and daily digest
4. `src/bot/handlers/callbackHandler.ts` - Add digest callback handling
5. `src/services/index.ts` - Export digest service

## Key Database Changes

### New table: `user_digest_history`

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userTelegramId | bigint | Foreign key to users table |
| dealId | integer | Foreign key to deals table |
| sentAt | timestamp | When the deal was sent in digest |

**Indexes:**
- Unique index on (userTelegramId, dealId)
- Index on userTelegramId
- Index on dealId
- Index on sentAt

## Key Functions to Add

### In queries.ts

- `getDealsForDigest(userTelegramId, limit?, offset?)` - Get visible deals not in history
- `getTotalDealsForDigestCount(userTelegramId)` - Count for pagination
- `markDealAsSentInDigest(userTelegramId, dealId)` - Record sent deal
- `wasDealSentInDigest(userTelegramId, dealId)` - Check history
- `getUsersWhoFavoritedDeal(dealId)` - Get users who favorited a specific deal

### In digestService.ts

- `sendDailyDigestToUser(bot, userTelegramId, offset?)` - Send to single user
- `sendDailyDigestToAllUsers(bot, userIds)` - Send to all users
- `sendInstantFavoriteNotification(bot, dealId)` - Send instant fav notifications

## Implementation Flow

### 1. After daily parsing completes:

```
For each newDeal in processResult.newDeals:
  - Call sendInstantFavoriteNotification(dealId)
Get all active users
Call sendDailyDigestToAllUsers(userIds)
```

### 2. Instant notification flow:

```
Get users who favorited the deal
For each user:
  - Skip if deal is hidden for them
  - Skip if already sent in digest
  - Send "Your favorite deal is back!" message + deal
  - Mark as sent in digest history
  - Wait 1.5 seconds
```

### 3. Digest flow:

```
Get deals for user (active, not hidden, not favorited, not in history)
Send header: "Daily Digest for [Store]. Found X new deals!"
Send up to 10 deals
If more deals available:
  - Send "Showing 1-10 of X" with "Show More" button
Mark each sent deal in digest history
300ms delay between deal messages
```

## Technical Details

| Setting | Value | Description |
|---------|-------|-------------|
| PAGE_SIZE | 10 | Deals per digest page |
| NOTIFICATION_DELAY_MS | 1500 | Delay between user notifications |
| Callback format | "digest:10", "digest:20" | Pagination callback data |

### Query Logic

**getDealsForDigest** should:
1. Get user's storeId
2. Join with products table
3. Left join with userDealPreferences to check isHidden and isFavorite
4. Left join with userDigestHistory to exclude already-sent deals
5. Filter: isActive=true, storeId matches, (isHidden=false or null), (isFavorite=false or null), digestHistory.id is null
6. Order by firstSeenAt DESC
7. Apply limit/offset for pagination

### Key Features

- Use existing `sendDealNotification()` for individual deal messages
- Join `userDigestHistory` table to filter out already-sent deals
- Join `userDealPreferences` to filter out hidden and favorited deals
- Digest callback handler processes "digest:N" callback_data for pagination
