# YEP Savings Deal Bot - New Features Plan

## Overview
Two new features to enhance user experience:
1. **Pagination for Deals** - Prevent spam by showing 10 deals at a time with "Show More" button
2. **Shopping Cart** - Allow users to create and manage a shopping cart from deals

---

## Feature 1: Deal Pagination

### Requirements
- Display 10 deals per page instead of all deals at once
- Add "Show More" button after the 10th deal
- Load next 10 deals when button is clicked
- Show total count and current position (e.g., "Showing 1-10 of 45 deals")
- Apply to `/deals` command only (favorites remain unpaginated)

### Database Changes
**No schema changes needed** - Use in-memory state or callback data

### Implementation Plan

#### 1. Update Deal Display Logic
**File:** `src/bot/commands/deals.ts`

**Changes:**
- Modify `handleDealsCommand()` to accept optional `offset` parameter
- Fetch deals with LIMIT 10 and OFFSET based on pagination
- Add pagination state to callback data format: `page:offset`
- Display count information: "📦 Showing 1-10 of 45 deals"
- Add "Show More" button after 10th deal if more deals exist

**New callback format:**
```typescript
// Current: "fav:123456" or "hide:123456"
// New pagination: "page:10" (offset value)
```

#### 2. Handle Pagination Callbacks
**File:** `src/bot/handlers/callbackHandler.ts`

**Changes:**
- Add new callback action: `page`
- Parse offset from callback data
- Call `handleDealsCommand()` with offset parameter
- Update message instead of sending new one (edit existing message)

#### 3. Database Query Updates
**File:** `src/database/queries.ts`

**Changes:**
- Add `limit` and `offset` parameters to `getActiveDealsWithProducts()`
- Add `getTotalActiveDealsCount()` function for count display
- Return both deals array and total count

**New function:**
```typescript
async function getTotalActiveDealsCount(
  storeId: number,
  userTelegramId: number
): Promise<number>
```

### Implementation Steps
1. Update `src/database/queries.ts`:
    - Add limit/offset to `getActiveDealsWithProducts()`
    - Add `getTotalActiveDealsCount()` function
2. Update `src/bot/commands/deals.ts`:
    - Add offset parameter to `handleDealsCommand()`
    - Implement pagination logic with "Show More" button
    - Display count information
3. Update `src/bot/handlers/callbackHandler.ts`:
    - Add `page` action handler
    - Route to `handleDealsCommand()` with offset
4. Testing:
    - Test with <10 deals (no pagination needed)
    - Test with >10 deals (pagination appears)
    - Test "Show More" button functionality
    - Test edge cases (exactly 10, 20, 21 deals, etc.)

---

## Feature 2: Shopping Cart

### Requirements
- Add "🛒 Add to Cart" button to deal messages
- New `/cart` command to view shopping cart
- "Clear Cart" button in cart view
- Track which deals are in user's shopping cart
- Show deal details in cart (same format as deals)
- Remove from cart button in cart view

### Database Changes

#### New Table: `user_shopping_cart`
```sql
CREATE TABLE user_shopping_cart (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_telegram_id, deal_id)
);

CREATE INDEX idx_shopping_cart_user ON user_shopping_cart(user_telegram_id);
CREATE INDEX idx_shopping_cart_deal ON user_shopping_cart(deal_id);
```

**Rationale:** Separate table instead of adding to `user_deal_preferences` because:
- Shopping cart is temporary (cleared regularly after shopping trips)
- Different lifecycle than favorites/hidden (cart = immediate purchase intent)
- Easier to clear all items at once
- Better query performance for cart-specific operations
- Follows e-commerce mental model (cart vs wishlist)

### Implementation Plan

#### 1. Database Schema & Queries
**File:** `src/database/schema.ts`

**Changes:**
- Add `userShoppingCart` table definition
- Add relations to users and deals tables

**File:** `src/database/queries.ts`

**New functions:**
```typescript
async function addToCart(userTelegramId: number, dealId: number)
async function removeFromCart(userTelegramId: number, dealId: number)
async function getUserCart(userTelegramId: number)
async function clearCart(userTelegramId: number)
async function isInCart(userTelegramId: number, dealId: number)
```

#### 2. Update Deal Message Format
**File:** `src/bot/commands/deals.ts` and `src/services/notificationService.ts`

**Changes:**
- Add "🛒 Add to Cart" button to inline keyboard
- Check if deal is already in cart
- If in cart, show "✅ In Cart" instead
- Callback format: `addcart:123456` or `remcart:123456`

**Button states:**
- Not in cart: `🛒 Add to Cart` → callback: `addcart:dealId`
- In cart: `✅ In Cart` → callback: `remcart:dealId`

#### 3. Shopping Cart Command
**File:** `src/bot/commands/cart.ts` (new)

**Implementation:**
- Fetch user's shopping cart with deal details
- Display each deal with product image and details
- Add inline buttons:
    - "🗑️ Remove" for each deal
    - "📋 Show Summary" button at the top (before deals)
    - "🧹 Clear Cart" button at the end
- Handle empty cart case
- Show total count: "🛒 Shopping Cart (5 items)"

**Callback format:**
- Remove item: `remcart:123456`
- Show summary: `cartsummary`
- Clear all: `clearcart`

#### 3a. Cart Summary Feature
**File:** `src/bot/commands/cart.ts`

**Implementation:**
- New function `handleCartSummary()` triggered by "📋 Show Summary" button
- Display compact list format in a single message:
  ```
  📋 Shopping Cart Summary (5 items)
  
  1. Brand Name - Product Name - $X.XX
  2. Brand Name - Product Name - $X.XX
  3. Brand Name - Product Name - $X.XX
  
  Total: $XX.XX
  ```
- No images, no buttons - just text for easy in-store reference
- Calculate total price of all items
- Truncate long product names to fit in one line
- Back button to return to full cart view

**Use Case:**
- User is in the store with phone
- Needs quick glance at what to buy
- Don't want to scroll through multiple messages with images
- Can quickly check off items as they shop

#### 4. Callback Handlers
**File:** `src/bot/handlers/callbackHandler.ts`

**New actions:**
- `addcart` - Add deal to shopping cart
- `remcart` - Remove deal from shopping cart
- `cartsummary` - Show compact cart summary
- `clearcart` - Clear entire shopping cart

**Response messages:**
- Add: "✅ Added to cart"
- Remove: "🗑️ Removed from cart"
- Summary: Display compact list
- Clear: "🧹 Cart cleared"

#### 5. Update Bot Registration
**File:** `src/bot/index.ts`

**Changes:**
- Register `/cart` command
- Add command description: "View your shopping cart"

### Implementation Steps
1. Update `src/database/schema.ts`:
    - Add `userShoppingCart` table
    - Add relations
2. Update `src/database/queries.ts`:
    - Add shopping cart CRUD functions
    - Add `isInCart()` check function
3. Create `src/bot/commands/cart.ts`:
    - Implement cart display
    - Add Cart Summary feature
    - Add Clear Cart functionality
4. Update `src/bot/commands/deals.ts`:
    - Add "Add to Cart" button
    - Check cart status for button state
5. Update `src/services/notificationService.ts`:
    - Add "Add to Cart" button to notifications
6. Update `src/bot/handlers/callbackHandler.ts`:
    - Add `addcart`, `remcart`, `cartsummary`, `clearcart` handlers
    - Update message buttons after actions
7. Update `src/bot/index.ts`:
    - Register `/cart` command
8. Testing:
    - Test adding/removing items
    - Test Clear Cart functionality
    - Test empty cart display
    - Test button state changes
    - Test with expired deals

---

## Migration Plan

### Database Migration
**File:** `src/database/migrations/0001_add_shopping_cart.sql`

```sql
-- Add shopping cart table
CREATE TABLE user_shopping_cart (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_telegram_id, deal_id)
);

-- Add indexes
CREATE INDEX idx_shopping_cart_user ON user_shopping_cart(user_telegram_id);
CREATE INDEX idx_shopping_cart_deal ON user_shopping_cart(deal_id);
```

### Deployment Steps
1. Run database migration to add `user_shopping_cart` table
2. Deploy updated code
3. Test all new features in production
4. Monitor Axiom logs for errors

---

## Testing Checklist

### Pagination Testing
- [ ] /deals with <10 deals (no pagination)
- [ ] /deals with exactly 10 deals (no pagination)
- [ ] /deals with 11-20 deals (one "Show More" button)
- [ ] /deals with >20 deals (multiple pagination clicks)
- [ ] "Show More" button loads next 10 deals
- [ ] Count display shows correct numbers
- [ ] Hidden deals are excluded from count

### Shopping Cart Testing
- [ ] Add deal to empty cart
- [ ] Add multiple deals to cart
- [ ] Add same deal twice (should be idempotent)
- [ ] View cart with deals
- [ ] View cart summary with compact list
- [ ] Cart summary shows correct total price
- [ ] Cart summary truncates long product names
- [ ] Back button from summary returns to full cart
- [ ] Remove single deal from cart
- [ ] Clear entire cart
- [ ] Add deal to cart from /deals command
- [ ] Add deal to cart from notification
- [ ] Button state changes (Add to Cart → In Cart)
- [ ] Cart with expired deals
- [ ] Cart displays deal images
- [ ] Empty cart message
- [ ] Summary with 1 item
- [ ] Summary with 10+ items

### Integration Testing
- [ ] Pagination works with cart buttons
- [ ] Cart items can be favorited
- [ ] Cart items can be hidden
- [ ] All callback data formats parse correctly
- [ ] Database queries perform well with large datasets

---

## Estimated Implementation Time

### Pagination Feature
- Database queries: 1 hour
- Deal command updates: 2 hours
- Callback handler: 1 hour
- Testing: 1 hour
  **Total: ~5 hours**

### Shopping Cart Feature
- Database schema & migration: 1 hour
- Database queries: 2 hours
- Cart command: 3 hours
- Cart summary feature: 1.5 hours
- Deal button updates: 2 hours
- Callback handlers: 2 hours
- Testing: 2.5 hours
  **Total: ~14 hours**

### Overall Total: ~19 hours

---

## Naming Convention Summary

### Commands
- `/cart` - View your shopping cart

### Buttons
- `🛒 Add to Cart` - Add deal to cart
- `✅ In Cart` - Deal already in cart
- `📋 Show Summary` - Display compact shopping list
- `🗑️ Remove` - Remove from cart
- `🧹 Clear Cart` - Empty entire cart
- `⬅️ Back to Cart` - Return from summary to full cart view

### Database
- Table: `user_shopping_cart`
- Functions: `addToCart()`, `removeFromCart()`, `getUserCart()`, `clearCart()`, `isInCart()`

### Callbacks
- `addcart:123456` - Add to cart
- `remcart:123456` - Remove from cart
- `cartsummary` - Show compact summary
- `backtocart` - Return to full cart view
- `clearcart` - Clear entire cart

---

## Future Enhancements (Not in this plan)
- Share cart with others
- Export cart to text/PDF
- Cart categories/sections
- Price alerts for cart items
- Store-specific carts
- Cart reminders before deals expire
- Cart total price calculation