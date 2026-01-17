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
