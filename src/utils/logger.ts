import { logger as axiomLogger } from '../config/axiom.js';
import { env } from '../config/env.js';
import type { EventContext } from '../types/logging.js';
import { EventTypes } from './eventTypes.js';

const baseFields = {
  environment: env.NODE_ENV,
  service_name: 'yep-savings-bot' as const,
  version: '1.0.0',
} as const;

export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function enrichEvent<T extends Record<string, unknown>>(
  eventType: string,
  data: T,
  context?: EventContext & { correlation_id?: string }
): T & typeof baseFields & EventContext & { event_type: string } {
  const enriched: Record<string, unknown> = {
    ...baseFields,
    event_type: eventType,
  };

  if (context?.correlation_id) {
    enriched.correlation_id = context.correlation_id;
  }

  if (context) {
    Object.assign(enriched, context);
  }

  Object.assign(enriched, data);

  return enriched as T & typeof baseFields & EventContext & { event_type: string };
}

export const log = {
  info: <T extends Record<string, unknown>>(
    eventType: string,
    data: T,
    context?: EventContext & { correlation_id?: string }
  ) => {
    axiomLogger.info(eventType, enrichEvent(eventType, data, context));
  },

  warn: <T extends Record<string, unknown>>(
    eventType: string,
    data: T,
    context?: EventContext & { correlation_id?: string }
  ) => {
    axiomLogger.warn(eventType, enrichEvent(eventType, data, context));
  },

  error: <T extends Record<string, unknown>>(
    eventType: string,
    data: T,
    context?: EventContext & { correlation_id?: string }
  ) => {
    axiomLogger.error(eventType, enrichEvent(eventType, data, context));
  },

  debug: <T extends Record<string, unknown>>(
    eventType: string,
    data: T,
    context?: EventContext & { correlation_id?: string }
  ) => {
    axiomLogger.debug(eventType, enrichEvent(eventType, data, context));
  },
};

export function withContext(context: EventContext): typeof log {
  const wrappedLog = {
    info: <T extends Record<string, unknown>>(
      eventType: string,
      data: T,
      additionalContext?: EventContext & { correlation_id?: string }
    ) => {
      const mergedContext = { ...context, ...additionalContext };
      log.info(eventType, data, mergedContext);
    },

    warn: <T extends Record<string, unknown>>(
      eventType: string,
      data: T,
      additionalContext?: EventContext & { correlation_id?: string }
    ) => {
      const mergedContext = { ...context, ...additionalContext };
      log.warn(eventType, data, mergedContext);
    },

    error: <T extends Record<string, unknown>>(
      eventType: string,
      data: T,
      additionalContext?: EventContext & { correlation_id?: string }
    ) => {
      const mergedContext = { ...context, ...additionalContext };
      log.error(eventType, data, mergedContext);
    },

    debug: <T extends Record<string, unknown>>(
      eventType: string,
      data: T,
      additionalContext?: EventContext & { correlation_id?: string }
    ) => {
      const mergedContext = { ...context, ...additionalContext };
      log.debug(eventType, data, mergedContext);
    },
  };

  return wrappedLog;
}

export async function flushLogs(): Promise<void> {
  await axiomLogger.flush();
}

export function createApiCallTracker(storeId: number, page?: number) {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();

  log.info(EventTypes.YEP_API_REQUEST, {
    store_id: storeId,
    page,
  }, { correlation_id: correlationId });

  return {
    success: (dealsCount: number, statusCode?: number) => {
      log.info(EventTypes.YEP_API_SUCCESS, {
        store_id: storeId,
        page,
        duration_ms: Date.now() - startTime,
        deals_count: dealsCount,
        status_code: statusCode,
      }, { correlation_id: correlationId });
    },

    error: (errorMessage: string, statusCode?: number) => {
      log.error(EventTypes.YEP_API_ERROR, {
        store_id: storeId,
        page,
        duration_ms: Date.now() - startTime,
        error_message: errorMessage,
        status_code: statusCode,
      }, { correlation_id: correlationId });
    },

    getCorrelationId: () => correlationId,
  };
}

export function createDealTracker(dealId: string, storeId: number, productUpc?: string) {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();

  return {
    processed: (data: {
      originalPrice?: number;
      currentPrice?: number;
      discountPercentage?: number;
      created: boolean;
      updated: boolean;
      expired?: boolean;
    }) => {
      log.info(EventTypes.DEAL_PROCESSED, {
        deal_id: dealId,
        product_upc: productUpc,
        store_id: storeId,
        original_price: data.originalPrice,
        current_price: data.currentPrice,
        discount_percentage: data.discountPercentage,
        processing_duration_ms: Date.now() - startTime,
        created: data.created,
        updated: data.updated,
        expired: data.expired,
      }, { correlation_id: correlationId });
    },

    getCorrelationId: () => correlationId,
  };
}

export function createNotificationTracker(userId: number, dealId: string) {
  const correlationId = generateCorrelationId();

  return {
    sent: (data: { storeId: number; productUpc?: string; hasImage: boolean; messageLength: number }) => {
      log.info(EventTypes.NOTIFICATION_SENT, {
        user_id: userId,
        deal_id: dealId,
        store_id: data.storeId,
        product_upc: data.productUpc,
        success: true,
        has_image: data.hasImage,
        message_length: data.messageLength,
      }, { correlation_id: correlationId });
    },

    failed: (errorMessage: string) => {
      log.error(EventTypes.NOTIFICATION_FAILED, {
        user_id: userId,
        deal_id: dealId,
        success: false,
        error_message: errorMessage,
      }, { correlation_id: correlationId });
    },

    getCorrelationId: () => correlationId,
  };
}

export function createBatchTracker(correlationId?: string) {
  const startTime = Date.now();
  const actualCorrelationId = correlationId || generateCorrelationId();

  return {
    complete: (eventType: string, data: Record<string, unknown>) => {
      log.info(eventType, {
        ...data,
        duration_ms: Date.now() - startTime,
      }, { correlation_id: actualCorrelationId });
    },

    getCorrelationId: () => actualCorrelationId,
  };
}

export function createJobTracker(_jobName: string, manual: boolean = false) {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();

  log.info(EventTypes.JOB_DAILY_PARSE_START, {
    manual_trigger: manual,
  }, { correlation_id: correlationId });

  return {
    complete: (data: {
      storesCount?: number;
      dealsProcessed?: number;
      newDealsFound?: number;
      notificationsSent?: number;
    }) => {
      log.info(EventTypes.JOB_DAILY_PARSE_COMPLETE, {
        stores_count: data.storesCount,
        deals_processed: data.dealsProcessed,
        new_deals_found: data.newDealsFound,
        notifications_sent: data.notificationsSent,
        duration_ms: Date.now() - startTime,
      }, { correlation_id: correlationId });
    },

    error: (errorMessage: string, data?: { storesCount?: number; dealsProcessed?: number }) => {
      log.error(EventTypes.JOB_DAILY_PARSE_ERROR, {
        stores_count: data?.storesCount,
        deals_processed: data?.dealsProcessed,
        error_message: errorMessage,
        duration_ms: Date.now() - startTime,
      }, { correlation_id: correlationId });
    },

    getCorrelationId: () => correlationId,
  };
}

export function createUserActionTracker(userId: number) {
  const correlationId = generateCorrelationId();

  return {
    command: (command: string, data: Record<string, unknown> = {}) => {
      log.info(EventTypes.USER_COMMAND, {
        command,
        success: true,
        ...data,
      }, { correlation_id: correlationId, user_id: userId });
    },

    callback: (action: string, data: Record<string, unknown> = {}) => {
      log.info(EventTypes.USER_CALLBACK, {
        callback_action: action,
        action,
        success: true,
        ...data,
      }, { correlation_id: correlationId, user_id: userId });
    },

    settingsChanged: (setting: string, oldValue: unknown, newValue: unknown) => {
      log.info(EventTypes.USER_SETTINGS_CHANGED, {
        setting,
        old_value: oldValue,
        new_value: newValue,
      }, { correlation_id: correlationId, user_id: userId });
    },

    created: () => {
      log.info(EventTypes.USER_CREATED, {
        success: true,
      }, { correlation_id: correlationId, user_id: userId });
    },

    getCorrelationId: () => correlationId,
  };
}

const queryFrequencyMap = new Map<string, number>();

export function getQueryFrequency(queryName: string): number {
  return queryFrequencyMap.get(queryName) || 0;
}

export function getAllQueryFrequencies(): Record<string, number> {
  return Object.fromEntries(queryFrequencyMap);
}

export function resetQueryFrequency(queryName: string): void {
  queryFrequencyMap.set(queryName, 0);
}

export function resetAllQueryFrequencies(): void {
  queryFrequencyMap.clear();
}

export function createDbQueryTracker(queryName: string, queryText?: string, slowThreshold: number = 1000) {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();

  return {
    complete: () => {
      const duration = Date.now() - startTime;

      if (duration > slowThreshold) {
        const frequency = (queryFrequencyMap.get(queryName) || 0) + 1;
        queryFrequencyMap.set(queryName, frequency);

        log.warn(EventTypes.DB_QUERY, {
          query_name: queryName,
          query_text: queryText,
          duration_ms: duration,
          slow_query: true,
          threshold_ms: slowThreshold,
          frequency,
        }, { correlation_id: correlationId });
      } else {
        const frequency = (queryFrequencyMap.get(queryName) || 0) + 1;
        queryFrequencyMap.set(queryName, frequency);

        log.debug(EventTypes.DB_QUERY, {
          query_name: queryName,
          duration_ms: duration,
          slow_query: false,
        }, { correlation_id: correlationId });
      }
    },

    error: (errorMessage: string) => {
      log.error(EventTypes.DB_ERROR, {
        query_name: queryName,
        query_text: queryText,
        duration_ms: Date.now() - startTime,
        error_message: errorMessage,
      }, { correlation_id: correlationId });
    },

    getCorrelationId: () => correlationId,
  };
}
