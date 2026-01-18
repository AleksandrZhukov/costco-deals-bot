import { log } from './logger.js';
import { EventTypes } from './eventTypes.js';
import type { EventContext } from '../types/logging.js';

type ErrorLoggingContext = EventContext & {
  error_type?: string;
  error_code?: string;
  fn_name?: string;
  query_name?: string;
  callback_data?: string;
};

export function logError(
  error: Error | unknown,
  context?: ErrorLoggingContext
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  const errorName = error instanceof Error ? error.name : 'Unknown';

  const finalErrorMessage = errorMessage || 'Unknown error';

  log.error(
    context?.error_type || EventTypes.ERROR_UNHANDLED,
    {
      error_message: finalErrorMessage,
      error_stack: errorStack,
      error_name: errorName,
      error_code: context?.error_code,
    },
    context
  );
}

export function logValidationError(
  error: Error | unknown,
  context?: EventContext
): void {
  logError(error, { ...context, error_type: EventTypes.ERROR_VALIDATION });
}

export function logNetworkError(
  error: Error | unknown,
  context?: EventContext & { error_code?: string }
): void {
  logError(error, { ...context, error_type: EventTypes.ERROR_NETWORK });
}

export function logDatabaseError(
  error: Error | unknown,
  context?: EventContext & { query_name?: string }
): void {
  logError(error, { ...context, error_type: EventTypes.ERROR_DATABASE });
}

export function createErrorLogger(context?: EventContext) {
  return {
    log: (error: Error | unknown, errorType?: string) => {
      logError(error, { ...context, error_type: errorType });
    },

    validation: (error: Error | unknown) => {
      logValidationError(error, context);
    },

    network: (error: Error | unknown, errorCode?: string) => {
      logNetworkError(error, { ...context, error_code: errorCode });
    },

    database: (error: Error | unknown, queryName?: string) => {
      logDatabaseError(error, { ...context, query_name: queryName });
    },
  };
}

export function wrapWithErrorLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: EventContext & { fn_name?: string }
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, {
        ...(context || {}),
        fn_name: context?.fn_name || fn.name,
      } as ErrorLoggingContext);
      throw error;
    }
  }) as T;
}
