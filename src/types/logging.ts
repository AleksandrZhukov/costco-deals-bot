import { z } from 'zod';

export const BaseEventSchema = z.object({
  event_type: z.string(),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
});

export interface BaseEvent {
  event_type: string;
  environment: 'development' | 'production' | 'test';
  service_name: 'yep-savings-bot';
  version: string;
}

export const EventContextSchema = z.object({
  user_id: z.number().optional(),
  store_id: z.number().optional(),
  deal_id: z.string().optional(),
  product_upc: z.string().optional(),
  command: z.string().optional(),
  callback_action: z.string().optional(),
});

export interface EventContext {
  user_id?: number;
  store_id?: number;
  deal_id?: string;
  product_upc?: string;
  command?: string;
  callback_action?: string;
}

export const DealProcessedEventSchema = z.object({
  event_type: z.literal('deal.processed'),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
  original_price: z.number().optional(),
  current_price: z.number().optional(),
  discount_percentage: z.number().optional(),
  processing_duration_ms: z.number(),
  created: z.boolean(),
  updated: z.boolean(),
  expired: z.boolean().optional(),
  user_id: z.number().optional(),
  store_id: z.number().optional(),
  deal_id: z.string().optional(),
  product_upc: z.string().optional(),
  command: z.string().optional(),
  callback_action: z.string().optional(),
});

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

export const NotificationEventSchema = z.object({
  event_type: z.union([z.literal('notification.sent'), z.literal('notification.failed')]),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
  success: z.boolean(),
  error_message: z.string().optional(),
  has_image: z.boolean(),
  message_length: z.number(),
  user_id: z.number().optional(),
  store_id: z.number().optional(),
  deal_id: z.string().optional(),
  product_upc: z.string().optional(),
  command: z.string().optional(),
  callback_action: z.string().optional(),
});

export interface NotificationEvent extends BaseEvent, EventContext {
  event_type: 'notification.sent' | 'notification.failed';
  success: boolean;
  error_message?: string;
  has_image: boolean;
  message_length: number;
}

export const ApiCallEventSchema = z.object({
  event_type: z.union([
    z.literal('yep.api.request'),
    z.literal('yep.api.success'),
    z.literal('yep.api.error'),
  ]),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
  store_id: z.number(),
  page: z.number().optional(),
  duration_ms: z.number().optional(),
  deals_count: z.number().optional(),
  error_message: z.string().optional(),
  status_code: z.number().optional(),
});

export interface ApiCallEvent extends BaseEvent {
  event_type: 'yep.api.request' | 'yep.api.success' | 'yep.api.error';
  store_id: number;
  page?: number;
  duration_ms?: number;
  deals_count?: number;
  error_message?: string;
  status_code?: number;
}

export const UserActionEventSchema = z.object({
  event_type: z.union([
    z.literal('user.command'),
    z.literal('user.callback'),
    z.literal('user.created'),
    z.literal('user.settings_changed'),
  ]),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
  command: z.string().optional(),
  action: z.string().optional(),
  success: z.boolean(),
  user_id: z.number().optional(),
  store_id: z.number().optional(),
  deal_id: z.string().optional(),
  product_upc: z.string().optional(),
  callback_action: z.string().optional(),
});

export interface UserActionEvent extends BaseEvent, EventContext {
  event_type: 'user.command' | 'user.callback' | 'user.created' | 'user.settings_changed';
  command?: string;
  action?: string;
  success: boolean;
}

export const ErrorEventSchema = z.object({
  event_type: z.union([
    z.literal('error.unhandled'),
    z.literal('error.validation'),
    z.literal('error.network'),
    z.literal('error.database'),
  ]),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
  error_message: z.string(),
  error_stack: z.string().optional(),
  error_code: z.string().optional(),
  user_id: z.number().optional(),
  store_id: z.number().optional(),
  deal_id: z.string().optional(),
  product_upc: z.string().optional(),
  command: z.string().optional(),
  callback_action: z.string().optional(),
});

export interface ErrorEvent extends BaseEvent, EventContext {
  event_type: 'error.unhandled' | 'error.validation' | 'error.network' | 'error.database';
  error_message: string;
  error_stack?: string;
  error_code?: string;
}

export const JobEventSchema = z.object({
  event_type: z.union([
    z.literal('job.daily_parse.start'),
    z.literal('job.daily_parse.complete'),
    z.literal('job.daily_parse.error'),
  ]),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
  stores_count: z.number().optional(),
  deals_processed: z.number().optional(),
  new_deals_found: z.number().optional(),
  notifications_sent: z.number().optional(),
  duration_ms: z.number().optional(),
  error_message: z.string().optional(),
});

export interface JobEvent extends BaseEvent {
  event_type: 'job.daily_parse.start' | 'job.daily_parse.complete' | 'job.daily_parse.error';
  stores_count?: number;
  deals_processed?: number;
  new_deals_found?: number;
  notifications_sent?: number;
  duration_ms?: number;
  error_message?: string;
}

export const SystemEventSchema = z.object({
  event_type: z.union([
    z.literal('app.startup'),
    z.literal('app.shutdown'),
    z.literal('health.check'),
  ]),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
  node_version: z.string().optional(),
  webhook_mode: z.boolean().optional(),
  signal: z.string().optional(),
  endpoint: z.string().optional(),
});

export interface SystemEvent extends BaseEvent {
  event_type: 'app.startup' | 'app.shutdown' | 'health.check';
  node_version?: string;
  webhook_mode?: boolean;
  signal?: string;
  endpoint?: string;
}

export const DealBatchEventSchema = z.object({
  event_type: z.union([
    z.literal('deal.new_detected'),
    z.literal('processing.batch_complete'),
  ]),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
  store_id: z.number(),
  deals_processed: z.number(),
  products_created: z.number().optional(),
  products_updated: z.number().optional(),
  deals_created: z.number().optional(),
  deals_updated: z.number().optional(),
  deals_expired: z.number().optional(),
  duration_ms: z.number(),
});

export interface DealBatchEvent extends BaseEvent {
  event_type: 'deal.new_detected' | 'processing.batch_complete';
  store_id: number;
  deals_processed: number;
  products_created?: number;
  products_updated?: number;
  deals_created?: number;
  deals_updated?: number;
  deals_expired?: number;
  duration_ms: number;
}

export const NotificationBatchEventSchema = z.object({
  event_type: z.literal('notification.batch_complete'),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
  total_notifications: z.number(),
  success_count: z.number(),
  failure_count: z.number(),
  duration_ms: z.number(),
});

export interface NotificationBatchEvent extends BaseEvent {
  event_type: 'notification.batch_complete';
  total_notifications: number;
  success_count: number;
  failure_count: number;
  duration_ms: number;
}

export const DatabaseEventSchema = z.object({
  event_type: z.union([
    z.literal('db.query'),
    z.literal('db.error'),
    z.literal('db.migration'),
  ]),
  environment: z.enum(['development', 'production', 'test']),
  service_name: z.literal('yep-savings-bot'),
  version: z.string(),
  query_name: z.string().optional(),
  duration_ms: z.number().optional(),
  slow_query: z.boolean().optional(),
  error_message: z.string().optional(),
});

export interface DatabaseEvent extends BaseEvent {
  event_type: 'db.query' | 'db.error' | 'db.migration';
  query_name?: string;
  duration_ms?: number;
  slow_query?: boolean;
  error_message?: string;
}

export type WideEvent =
  | DealProcessedEvent
  | NotificationEvent
  | ApiCallEvent
  | UserActionEvent
  | ErrorEvent
  | JobEvent
  | SystemEvent
  | DealBatchEvent
  | NotificationBatchEvent
  | DatabaseEvent;

export const WideEventSchema = z.discriminatedUnion('event_type', [
  DealProcessedEventSchema,
  NotificationEventSchema,
  ApiCallEventSchema,
  UserActionEventSchema,
  ErrorEventSchema,
  JobEventSchema,
  SystemEventSchema,
  DealBatchEventSchema,
  NotificationBatchEventSchema,
  DatabaseEventSchema,
]);

export type WideEventSchemaType = z.infer<typeof WideEventSchema>;

export function parseWideEvent(data: unknown): WideEvent {
  return WideEventSchema.parse(data) as WideEvent;
}

export function safeParseWideEvent(data: unknown): {
  success: boolean;
  data?: WideEvent;
  error?: z.ZodError;
} {
  const result = WideEventSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as WideEvent };
  } else {
    return { success: false, error: result.error };
  }
}
