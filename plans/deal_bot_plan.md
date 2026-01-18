# Telegram Bot for YEP Savings Deal Tracker

## Project Overview
A personal Telegram bot that monitors deals from YEP Savings (Beacon Hill, Calgary location), stores them in a PostgreSQL database, and allows users to interact with deals through marking favorites and hiding unwanted items.

## Tech Stack
- **Runtime**: Node.js 24
- **Language**: TypeScript (latest)
- **TypeScript Execution**: tsx
- **HTTP Client**: Axios
- **Bot Framework**: node-telegram-bot-api (or grammy/telegraf - choose one)
- **Database**: PostgreSQL via Neon
- **ORM**: Drizzle ORM (recommended for TypeScript) or Prisma
- **Task Scheduling**: node-cron
- **Environment Validation**: @t3-oss/env-core
- **Schema Validation**: Zod
- **Containerization**: Docker

## Core Features

### 1. Daily Deal Parsing
- Schedule daily parsing of YEP Savings API endpoint
- API endpoint: `https://yepsavings.com/api/customerPc/getProductList`
- Parameters:
  - `userId=0`
  - `storeId={user_store_id}` (configurable per user)
  - `goodsType=0`
  - `searchKey=` (empty)
  - `pageNum=1`
  - `pageSize=1000`
- Headers: `Cookie: ezoictest=stable`
- Parse deals for each user's configured store

### 2. Deal Detection & Notification
- Compare fetched deals with existing database records
- Detect new deals by checking `is_latest` flag and comparing IDs
- Send Telegram notification for new deals with:
  - Product name/brand
  - Price information (current price, source price, discount)
  - Deal image
  - Inline buttons for "Favorite" and "Hide"

### 3. User Interactions
- `/start` - Initialize bot and show welcome message
- `/deals` - Show current active deals from user's selected store (excluding hidden ones)
- `/favorites` - Show favorited deals
- `/settings` - Configure user preferences:
  - Select YEP Savings store location
  - Toggle notifications on/off
  - Set notification time preferences
- Inline buttons on deal messages:
  - ⭐ Favorite
  - 🚫 Hide
  - ℹ️ View Details

## Database Schema

### Tables

#### `products`
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  itm_upc_code TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  name TEXT,
  spec TEXT,
  goods_type INTEGER, -- fk_goods_type from API
  goods_second_type INTEGER, -- fk_goods_second_type from API
  goods_img TEXT,
  frequency INTEGER DEFAULT 0, -- how often this product appears in deals
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_upc ON products(itm_upc_code);
CREATE INDEX idx_products_brand ON products(brand);
```

#### `deals`
```sql
CREATE TABLE deals (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER UNIQUE NOT NULL, -- from API response (id field)
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  current_price DECIMAL(10, 2),
  source_price DECIMAL(10, 2),
  discount_price DECIMAL(10, 2),
  discount_type INTEGER,
  start_time TIMESTAMP, -- create_time from API
  end_time TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  is_latest BOOLEAN DEFAULT FALSE, -- is_latest flag from API
  likes_count INTEGER DEFAULT 0,
  forwards_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  raw_data JSONB, -- store full API response for reference
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deals_product ON deals(product_id);
CREATE INDEX idx_deals_active ON deals(is_active);
CREATE INDEX idx_deals_latest ON deals(is_latest);
CREATE INDEX idx_deals_deal_id ON deals(deal_id);
```

#### `user_deal_preferences`
```sql
CREATE TABLE user_deal_preferences (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_telegram_id, deal_id)
);

CREATE INDEX idx_user_prefs_user ON user_deal_preferences(user_telegram_id);
CREATE INDEX idx_user_prefs_deal ON user_deal_preferences(deal_id);
CREATE INDEX idx_user_prefs_favorite ON user_deal_preferences(is_favorite);
CREATE INDEX idx_user_prefs_hidden ON user_deal_preferences(is_hidden);
```

#### `users`
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  store_id INTEGER NOT NULL DEFAULT 25, -- YEP Savings store ID (user configurable)
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_store_id ON users(store_id);
```

#### `notification_log`
```sql
CREATE TABLE notification_log (
  id SERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  deal_id INTEGER REFERENCES deals(id),
  sent_at TIMESTAMP DEFAULT NOW(),
  was_successful BOOLEAN
);
```

## Project Structure

```
telegram-deal-bot/
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
│   │   ├── schema.ts            # Drizzle/Prisma schema
│   │   ├── migrations/          # DB migrations
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
│   │   └── yepApi.ts            # TypeScript interfaces and Zod schemas for YEP API
│   └── index.ts                 # Main entry point
├── .env.example
├── .env
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Key Implementation Details

### Environment Configuration (T3 Env)

**src/config/env.ts**
```typescript
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    DATABASE_URL: z.string().url(),
    PARSE_SCHEDULE: z.string().default("0 8 * * *"),
    TIMEZONE: z.string().default("America/Edmonton"),
    YEP_SAVINGS_API_URL: z.string().url().default("https://yepsavings.com/api/customerPc/getProductList"),
  },
  runtimeEnv: process.env,
});
```

### API Response Validation with Zod

**src/types/yepApi.ts**
```typescript
import { z } from "zod";

// Zod schema for YEP API deal item validation
export const YepDealItemSchema = z.object({
  id: z.number(),
  brand: z.string(),
  name: z.string(),
  spec: z.string(),
  itm_upc_code: z.string(),
  cur_price: z.string().optional().default(""),
  source_price: z.string().optional().default(""),
  discount_price: z.string(),
  discount_type: z.number(),
  fk_goods_type: z.number(),
  goods_img: z.string().url(),
  create_time: z.string(),
  end_time: z.string().optional(),
  is_latest: z.number().optional(),
  frequency: z.number(),
  likesCount: z.number(),
  hack_card: z.string(),
  fk_goods_second_type: z.number(),
  forwardsCount: z.number(),
  commentsCount: z.number(),
  online: z.number(),
  fk_store: z.number(),
  fresh_type: z.number().optional(),
  hasHistoryPrice: z.number().optional(),
  typeSortNum: z.number().optional(),
  isLike: z.number().optional(),
  firstTypeSortNum: z.number().optional(),
  hasTiktok: z.number().optional(),
  in_list: z.number().optional(),
  img_cnt: z.number().optional(),
  createTime: z.string().optional(),
  endTime: z.string().optional(),
  forward_img_url: z.string().optional(),
});

// Zod schema for YEP API goods type
export const YepGoodsTypeSchema = z.object({
  type_name: z.string(),
  id: z.number(),
  create_time: z.string().optional(),
  edit_time: z.string().optional(),
  level: z.number().optional(),
  sort_num: z.number().optional(),
  index: z.number().optional(),
  dr: z.number().optional(),
});

// Zod schema for complete YEP API response
export const YepApiResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.object({
    goodsType: z.array(YepGoodsTypeSchema),
    goods: z.array(YepDealItemSchema),
    discountCnt: z.number(),
    totalPage: z.number(),
    process: z.number(),
  }),
});

// TypeScript types inferred from Zod schemas
export type YepDealItem = z.infer<typeof YepDealItemSchema>;
export type YepGoodsType = z.infer<typeof YepGoodsTypeSchema>;
export type YepApiResponse = z.infer<typeof YepApiResponseSchema>;

// Helper function to safely parse YEP API response
export function parseYepApiResponse(data: unknown): YepApiResponse {
  return YepApiResponseSchema.parse(data);
}

// Helper function for safe parsing with error handling
export function safeParseYepApiResponse(data: unknown): {
  success: boolean;
  data?: YepApiResponse;
  error?: z.ZodError;
} {
  const result = YepApiResponseSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}
```

### Daily Parser Logic with Validation

**src/services/yepApi/client.ts**
```typescript
import axios from "axios";
import { env } from "../../config/env";

export const yepApiClient = axios.create({
  baseURL: env.YEP_SAVINGS_API_URL,
  headers: {
    Cookie: "ezoictest=stable",
  },
});
```

**src/services/yepApi/dealParser.ts**
```typescript
import { yepApiClient } from "./client";
import { safeParseYepApiResponse, type YepDealItem } from "../../types/yepApi";

export async function fetchDealsForStore(storeId: number): Promise<YepDealItem[]> {
  try {
    const response = await yepApiClient.get("", {
      params: {
        userId: 0,
        storeId: storeId,
        goodsType: 0,
        searchKey: "",
        pageNum: 1,
        pageSize: 1000,
      },
    });

    // Validate response with Zod
    const parseResult = safeParseYepApiResponse(response.data);
    
    if (!parseResult.success) {
      console.error("YEP API response validation failed:", parseResult.error.errors);
      throw new Error("Invalid YEP API response format");
    }

    // Check if API returned success code
    if (parseResult.data.code !== 200) {
      throw new Error(`YEP API returned error code: ${parseResult.data.code}`);
    }

    return parseResult.data.data.goods;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error fetching deals from YEP API:", error.message);
    } else {
      console.error("Error fetching deals from YEP API:", error);
    }
    throw error;
  }
}
```

**Process Flow:**
1. Fetch all active users from database with their configured `store_id`
2. For each unique `store_id`:
   - Make GET request to YEP API endpoint using Axios client
   - Validate response structure with Zod schema
   - If validation fails, log detailed errors and throw exception
   - Extract `data.goods` array from validated response
3. For each deal item:
   - **Product Processing:**
     - Check if product exists in `products` table by `itm_upc_code`
     - If product doesn't exist, insert new product with brand, name, spec, goods_type, etc.
     - If product exists, update `frequency` counter and image if changed
   - **Deal Processing:**
     - Check if deal exists in `deals` table by `deal_id`
     - If new deal (`is_latest === 1` or not in DB):
       - Insert new deal record with reference to product_id
       - Set `is_active = true` and `is_latest = true`
     - If existing deal, update prices and metadata
     - Mark deals with past `end_time` as `is_active = false`
4. Return list of new active deals per store for notification to relevant users

### Notification Logic
1. For each new deal:
   - Query `users` table for active users with `notifications_enabled = true`
   - For each user:
     - Check if deal is hidden in `user_deal_preferences`
     - If not hidden, send Telegram message with:
       - Photo (from `products.goods_img` via join)
       - Caption with deal details (product brand, name, prices)
       - Inline keyboard with "Favorite" and "Hide" buttons
     - Log notification in `notification_log`

**Example query for deal with product info:**
```sql
SELECT 
  d.id as deal_id,
  d.current_price,
  d.source_price,
  d.discount_price,
  d.end_time,
  p.brand,
  p.name,
  p.spec,
  p.goods_img
FROM deals d
INNER JOIN products p ON d.product_id = p.id
WHERE d.is_latest = true 
  AND d.is_active = true
ORDER BY d.first_seen_at DESC;
```

### Callback Handler
1. Parse callback data (format: `action:dealId`, e.g., `fav:365226` or `hide:365226`)
2. Extract user's Telegram ID
3. Upsert into `user_deal_preferences`:
   - For "favorite": Set `is_favorite = true`
   - For "hide": Set `is_hidden = true`
4. Update message with confirmation or remove from chat

## Docker Configuration

### Dockerfile
```dockerfile
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (if needed for health checks)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  telegram-bot:
    build: .
    container_name: yep-savings-bot
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - DATABASE_URL=${DATABASE_URL}
      - PARSE_SCHEDULE=${PARSE_SCHEDULE:-0 8 * * *}
      - TIMEZONE=${TIMEZONE:-America/Edmonton}
      - YEP_SAVINGS_API_URL=${YEP_SAVINGS_API_URL}

    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    networks:
      - bot-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  bot-network:
    driver: bridge
```

### .dockerignore
```
node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
README.md
.vscode
.idea
dist
coverage
.DS_Store
*.log
```

## Environment Variables

**.env.example**
```env
# Node Environment
NODE_ENV=production

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Scheduling
PARSE_SCHEDULE=0 8 * * *
TIMEZONE=America/Edmonton

# YEP Savings API Configuration
YEP_SAVINGS_API_URL=https://yepsavings.com/api/customerPc/getProductList

# Note: Store ID is now per-user setting in database, not environment variable
```

## Setup Instructions

### 1. Initialize Project
```bash
# Create project directory
mkdir telegram-deal-bot && cd telegram-deal-bot

# Initialize npm project
npm init -y

# Install dependencies
npm install axios node-telegram-bot-api node-cron @t3-oss/env-core zod

# Install TypeScript and dev dependencies
npm install -D typescript @types/node @types/node-telegram-bot-api @types/node-cron tsx

# For Drizzle ORM
npm install drizzle-orm postgres
npm install -D drizzle-kit

# OR for Prisma
npm install prisma @prisma/client
npm install -D prisma
```

### 2. TypeScript Configuration

**tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. Package.json Scripts
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate:pg",
    "db:push": "drizzle-kit push:pg",
    "db:migrate": "tsx src/database/migrate.ts"
  }
}
```

### 4. Database Setup
- Create account on [Neon](https://neon.tech)
- Create new PostgreSQL database
- Copy connection string to `.env` as `DATABASE_URL`
- Run migrations to create tables

### 5. Bot Setup
- Create bot with [@BotFather](https://t.me/botfather) on Telegram
- Get bot token and add to `.env` as `TELEGRAM_BOT_TOKEN`

### 6. Local Development
```bash
# Copy environment variables
cp .env.example .env

# Edit .env with your actual values
nano .env

# Run in development mode
npm run dev
```

### 7. Docker Deployment
```bash
# Build Docker image
docker build -t yep-savings-bot .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f telegram-bot

# Stop container
docker-compose down
```

### 8. Home Lab Server Deployment
```bash
# On your server, pull the repository or copy files
git clone <your-repo> telegram-deal-bot
cd telegram-deal-bot

# Create .env file with production values
nano .env

# Start with docker-compose
docker-compose up -d

# Enable auto-restart on server reboot
# (docker-compose.yml already has restart: unless-stopped)

# Monitor logs
docker-compose logs -f
```

## Production Considerations

### Logging
- Implement structured logging with Winston or Pino
- Mount logs volume in Docker for persistence
- Set up log rotation

### Error Handling
- Implement retry logic for API failures (axios-retry)
- Add exponential backoff for Telegram API calls
- Graceful shutdown handling

### Security
- Never commit `.env` file
- Use secrets management for production
- Implement rate limiting for bot commands
- Validate all user inputs

### Performance
- Use connection pooling for database
- Implement caching for frequently accessed data
- Optimize database queries with indexes
- Consider using Telegram webhooks instead of polling in production

## Future Enhancements

- Price history tracking and alerts
- Deal expiration reminders
- Category-based filtering
- Multi-store support
- Weekly/monthly deal summaries
- Share deals with other users
- Deal search functionality
- Web dashboard for deal management
- Export deals to CSV/PDF