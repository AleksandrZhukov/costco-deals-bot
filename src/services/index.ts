export {
  processDealsFromApi,
  expireExpiredDeals,
  type ProcessDealsResult,
} from "./dealProcessor.js";
export {
  findNewDeals,
  compareDeals,
  getDealsNeedingNotification,
  type CompareDealsOptions,
  type CompareDealsResult,
} from "./dealComparator.js";
export {
  sendDealNotification,
  sendBatchNotifications,
} from "./notificationService.js";
export {
  sendDailyDigestToUser,
  sendDailyDigestToAllUsers,
  sendInstantFavoriteNotification,
} from "./digestService.js";
