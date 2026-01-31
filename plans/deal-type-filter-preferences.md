# Implementation Plan: Deal Type Filter Preferences

## Overview
Add user preferences to filter deals by type (Food=4, Non-Food=6, Clothing=5). Default is "All types". Filter affects `/deals` command and daily digest only - favorites and cart remain unaffected.

## Design Decisions
- Default: All types for new users
- Hardcoded deal types
- Storage: Array of integers `[4, 5]` in database
- Multi-select: Users can select multiple types
- Clearance (id=999999): Excluded entirely
- Filter scope: Only affects daily digest and `/deals`, NOT favorites or cart

---

## Phase 1: Database Schema & Types

### File: `src/types/index.ts`
Add deal type constants:
```typescript
export const DEAL_TYPES = [
  { id: 4, name: "Food", emoji: "🍔" },
  { id: 5, name: "Clothing", emoji: "👕" },
  { id: 6, name: "Non-Food", emoji: "📦" },
] as const;

export type DealTypeId = typeof DEAL_TYPES[number]['id'];
```

### File: `src/database/schema.ts`
Add new table `userDealTypePreferences`:
- `id` (serial, primary key)
- `userTelegramId` (bigint, notNull, unique)
- `selectedTypeIds` (integer[]) - PostgreSQL array of type IDs
- `createdAt`, `updatedAt` timestamps
- Index on `userTelegramId`

Add relations for the new table.

**Run migration** with drizzle-kit

---

## Phase 2: Database Queries

### File: `src/database/queries.ts`

Add new functions:
1. `getUserDealTypePreferences(userTelegramId)` - returns selected type IDs or empty array
2. `updateUserDealTypePreferences(userTelegramId, typeIds)` - save selection
3. `clearUserDealTypePreferences(userTelegramId)` - reset to all (delete record)

Modify existing functions to accept optional `typeIds` filter:
- `getActiveDealsWithProductsNotHidden(userTelegramId, limit?, offset?, typeIds?)`
- `getDealsForDigest(userTelegramId, limit?, offset?, typeIds?)`
- `getTotalVisibleActiveDealsCount(userTelegramId, typeIds?)`
- `getTotalDealsForDigestCount(userTelegramId, typeIds?)`

Filter logic: If `typeIds` is provided and non-empty, add `WHERE products.goodsType IN (typeIds)`.

---

## Phase 3: Bot Commands

### New File: `src/bot/commands/dealTypes.ts`

Create `/types` command:
1. Fetch user's current preferences
2. Display message with current selection
3. Inline keyboard with:
   - Toggle button for each type (✅ or ⬜)
   - "Select All" button
   - "Clear All" button (optional, would show nothing)
   - "Back to Settings" button
4. Handle type toggling with callback queries

### File: `src/bot/handlers/callbackHandler.ts`

Add new callback actions:
- `toggle_type:<typeId>` - toggle specific type on/off
- `select_all_types` - clear preferences (all types)
- `clear_all_types` - set empty array (no types)
- `navigate_types` - show type selector
- `back_to_settings` - return to settings

### File: `src/bot/commands/settings.ts`

1. Display current type preferences in settings message
2. Add "🎯 Deal Types" button linking to type selector

### File: `src/bot/index.ts`

1. Register `/types` command in `onText` handler
2. Add to command list in `registerCommands()`

---

## Phase 4: Update Deal Commands

### File: `src/bot/commands/deals.ts`

1. Import `getUserDealTypePreferences`
2. Fetch user's type preferences before querying deals
3. Pass type IDs to `getActiveDealsWithProductsNotHidden()` and `getTotalVisibleActiveDealsCount()`
4. If user has no preferences (null), pass empty array (all types)

---

## Phase 5: Update Digest Logic

### File: `src/database/queries.ts` (already covered in Phase 2)
Ensure `getDealsForDigest` and `getTotalDealsForDigestCount` respect type filters.

The daily digest scheduler will automatically use the updated queries.

---

## Implementation Notes

### Filter Logic:
- No preferences record in DB = show all types
- Empty array `[]` = show nothing (edge case)
- Array with values `[4, 5]` = show only those types

### Database Queries:
Use PostgreSQL's `= ANY()` or `IN` clause:
```sql
WHERE products.goods_type = ANY(${typeIds})
```

### UI Flow:
1. User runs `/settings` → sees "Deal Types: All" (or specific types)
2. Clicks "🎯 Deal Types" → sees type selector
3. Toggles types on/off → immediate feedback
4. Types saved instantly on each toggle

---

## Files to Modify:
1. `src/types/index.ts` - add constants
2. `src/database/schema.ts` - add table
3. `src/database/queries.ts` - add functions & modify queries
4. `src/bot/commands/settings.ts` - add type button
5. `src/bot/commands/deals.ts` - apply filter
6. `src/bot/handlers/callbackHandler.ts` - add callbacks
7. `src/bot/index.ts` - register command
8. **NEW** `src/bot/commands/dealTypes.ts` - type selector UI

---

## Testing Checklist
- [ ] New users see all types by default
- [ ] Type selector UI displays correctly
- [ ] Toggling types saves to database
- [ ] `/deals` respects type filter
- [ ] Daily digest respects type filter
- [ ] Favorites are NOT filtered by type
- [ ] Cart is NOT filtered by type
- [ ] Empty type selection shows no deals
- [ ] "Select All" clears filter
- [ ] Settings page shows current selection
