export const EventTypes = {
  APP_STARTUP: 'app.startup',
  APP_SHUTDOWN: 'app.shutdown',
  HEALTH_CHECK: 'health.check',

  YEP_API_REQUEST: 'yep.api.request',
  YEP_API_SUCCESS: 'yep.api.success',
  YEP_API_ERROR: 'yep.api.error',

  DEAL_PROCESSED: 'deal.processed',
  DEAL_EXPIRED: 'deal.expired',
  DEAL_NEW_DETECTED: 'deal.new_detected',
  PROCESSING_BATCH_COMPLETE: 'processing.batch_complete',

  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  NOTIFICATION_BATCH_COMPLETE: 'notification.batch_complete',

  USER_CREATED: 'user.created',
  USER_COMMAND: 'user.command',
  USER_CALLBACK: 'user.callback',
  USER_SETTINGS_CHANGED: 'user.settings_changed',

  DB_QUERY: 'db.query',
  DB_ERROR: 'db.error',
  DB_MIGRATION: 'db.migration',

  JOB_DAILY_PARSE_START: 'job.daily_parse.start',
  JOB_DAILY_PARSE_COMPLETE: 'job.daily_parse.complete',
  JOB_DAILY_PARSE_ERROR: 'job.daily_parse.error',

  ERROR_UNHANDLED: 'error.unhandled',
  ERROR_VALIDATION: 'error.validation',
  ERROR_NETWORK: 'error.network',
  ERROR_DATABASE: 'error.database',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export const SystemEventTypes = [
  EventTypes.APP_STARTUP,
  EventTypes.APP_SHUTDOWN,
  EventTypes.HEALTH_CHECK,
] as const;

export const ApiEventTypes = [
  EventTypes.YEP_API_REQUEST,
  EventTypes.YEP_API_SUCCESS,
  EventTypes.YEP_API_ERROR,
] as const;

export const DealEventTypes = [
  EventTypes.DEAL_PROCESSED,
  EventTypes.DEAL_EXPIRED,
  EventTypes.DEAL_NEW_DETECTED,
  EventTypes.PROCESSING_BATCH_COMPLETE,
] as const;

export const NotificationEventTypes = [
  EventTypes.NOTIFICATION_SENT,
  EventTypes.NOTIFICATION_FAILED,
  EventTypes.NOTIFICATION_BATCH_COMPLETE,
] as const;

export const UserEventTypes = [
  EventTypes.USER_CREATED,
  EventTypes.USER_COMMAND,
  EventTypes.USER_CALLBACK,
  EventTypes.USER_SETTINGS_CHANGED,
] as const;

export const DatabaseEventTypes = [
  EventTypes.DB_QUERY,
  EventTypes.DB_ERROR,
  EventTypes.DB_MIGRATION,
] as const;

export const JobEventTypes = [
  EventTypes.JOB_DAILY_PARSE_START,
  EventTypes.JOB_DAILY_PARSE_COMPLETE,
  EventTypes.JOB_DAILY_PARSE_ERROR,
] as const;

export const ErrorEventTypes = [
  EventTypes.ERROR_UNHANDLED,
  EventTypes.ERROR_VALIDATION,
  EventTypes.ERROR_NETWORK,
  EventTypes.ERROR_DATABASE,
] as const;

export const AllEventGroups = {
  system: SystemEventTypes,
  api: ApiEventTypes,
  deals: DealEventTypes,
  notifications: NotificationEventTypes,
  users: UserEventTypes,
  database: DatabaseEventTypes,
  jobs: JobEventTypes,
  errors: ErrorEventTypes,
} as const;
