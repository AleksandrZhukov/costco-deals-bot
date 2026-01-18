import type { YepDealItem } from "../types/yepApi.js";
import type { products, deals } from "../database/schema.js";
import {
  getProductByUpc,
  createProduct,
  updateProduct,
  incrementProductFrequency,
  getDealByDealId,
  createDeal,
  updateDeal,
  getActiveDeals,
} from "../database/queries.js";

type Product = typeof products.$inferSelect;
type Deal = typeof deals.$inferSelect;

export interface ProcessDealsResult {
  productsCreated: number;
  productsUpdated: number;
  dealsCreated: number;
  dealsUpdated: number;
  dealsExpired: number;
  newDeals: Deal[];
}

export async function processDealsFromApi(
  apiDeals: YepDealItem[],
  _storeId: number
): Promise<ProcessDealsResult> {
  const result: ProcessDealsResult = {
    productsCreated: 0,
    productsUpdated: 0,
    dealsCreated: 0,
    dealsUpdated: 0,
    dealsExpired: 0,
    newDeals: [],
  };

  for (const apiDeal of apiDeals) {
    try {
      const productResult = await processProduct(apiDeal);
      if (productResult.productCreated) {
        result.productsCreated++;
      } else if (productResult.productUpdated) {
        result.productsUpdated++;
      }

      const dealResult = await processDeal(apiDeal, productResult.product);
      if (dealResult.dealCreated) {
        result.dealsCreated++;
        if (dealResult.isNewDeal) {
          result.newDeals.push(dealResult.deal);
        }
      } else if (dealResult.dealUpdated) {
        result.dealsUpdated++;
      }

      if (dealResult.expired) {
        result.dealsExpired++;
      }
    } catch (error) {
      console.error(`Error processing deal ${apiDeal.id}:`, error);
    }
  }

  return result;
}

export async function expireExpiredDeals(): Promise<number> {
  const now = new Date();
  const activeDeals = await getActiveDeals();
  let expiredCount = 0;

  for (const deal of activeDeals) {
    if (deal.endTime && deal.endTime < now) {
      await updateDeal(deal.dealId, { isActive: false });
      expiredCount++;
    }
  }

  return expiredCount;
}

async function processProduct(
  apiDeal: YepDealItem
): Promise<{
  product: Product;
  productCreated: boolean;
  productUpdated: boolean;
}> {
  const existingProduct = await getProductByUpc(apiDeal.itm_upc_code);

  if (existingProduct) {
    const updatedProduct = await updateProduct(apiDeal.itm_upc_code, {
      name: apiDeal.name,
      spec: apiDeal.spec,
      goodsImg: apiDeal.goods_img,
    });
    await incrementProductFrequency(apiDeal.itm_upc_code);
    return {
      product: updatedProduct ?? existingProduct,
      productCreated: false,
      productUpdated: true,
    };
  }

  const newProduct = await createProduct({
    itmUpcCode: apiDeal.itm_upc_code,
    brand: apiDeal.brand,
    name: apiDeal.name,
    spec: apiDeal.spec,
    goodsType: apiDeal.fk_goods_type,
    goodsSecondType: apiDeal.fk_goods_second_type,
    goodsImg: apiDeal.goods_img,
  });

  return {
    product: newProduct,
    productCreated: true,
    productUpdated: false,
  };
}

async function processDeal(
  apiDeal: YepDealItem,
  product: Product
): Promise<{
  deal: Deal;
  dealCreated: boolean;
  dealUpdated: boolean;
  isNewDeal: boolean;
  expired: boolean;
}> {
  const existingDeal = await getDealByDealId(apiDeal.id);
  const now = new Date();
  const endTime = apiDeal.end_time ? new Date(apiDeal.end_time) : null;
  const isExpired = endTime && endTime < now;

  if (existingDeal) {
    const wasLatest = existingDeal.isLatest ?? false;
    const isLatest = apiDeal.is_latest === 1;

    const updatedDeal = await updateDeal(apiDeal.id, {
      currentPrice: apiDeal.cur_price || undefined,
      sourcePrice: apiDeal.source_price || undefined,
      discountPrice: apiDeal.discount_price,
      discountType: apiDeal.discount_type,
      startTime: apiDeal.create_time ? new Date(apiDeal.create_time) : undefined,
      endTime: endTime ?? undefined,
      isLatest: isLatest,
      isActive: !isExpired,
      likesCount: apiDeal.likesCount,
      forwardsCount: apiDeal.forwardsCount,
      commentsCount: apiDeal.commentsCount,
    });

    return {
      deal: updatedDeal ?? existingDeal,
      dealCreated: false,
      dealUpdated: true,
      isNewDeal: isLatest && !wasLatest,
      expired: Boolean(isExpired),
    };
  }

  const newDeal = await createDeal({
    dealId: apiDeal.id,
    productId: product.id,
    currentPrice: apiDeal.cur_price || undefined,
    sourcePrice: apiDeal.source_price || undefined,
    discountPrice: apiDeal.discount_price,
    discountType: apiDeal.discount_type,
    startTime: apiDeal.create_time ? new Date(apiDeal.create_time) : undefined,
    endTime: endTime ?? undefined,
    isLatest: apiDeal.is_latest === 1,
    likesCount: apiDeal.likesCount,
    forwardsCount: apiDeal.forwardsCount,
    commentsCount: apiDeal.commentsCount,
    rawData: apiDeal,
  });

  return {
    deal: newDeal,
    dealCreated: true,
    dealUpdated: false,
    isNewDeal: apiDeal.is_latest === 1,
    expired: Boolean(isExpired),
  };
}
