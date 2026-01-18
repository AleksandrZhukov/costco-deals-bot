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
  goods_img: z.string().url().optional(),
  create_time: z.string(),
  end_time: z.string().optional(),
  is_latest: z.number().optional(),
  frequency: z.number(),
  likesCount: z.number(),
  hack_card: z.string(),
  fk_goods_second_type: z.number().optional(),
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

// Zod schema for successful YEP API response data
export const YepApiSuccessDataSchema = z.object({
  goodsType: z.array(YepGoodsTypeSchema),
  goods: z.array(YepDealItemSchema),
  discountCnt: z.number(),
  totalPage: z.number(),
  process: z.number(),
});

// Zod schema for complete YEP API response (handles both success and error)
export const YepApiResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.union([
    z.string(),
    YepApiSuccessDataSchema,
  ]),
});

// TypeScript types inferred from Zod schemas
export type YepDealItem = z.infer<typeof YepDealItemSchema>;
export type YepGoodsType = z.infer<typeof YepGoodsTypeSchema>;
export type YepApiSuccessData = z.infer<typeof YepApiSuccessDataSchema>;
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

// Helper function to check if response is successful
export function isApiSuccessResponse(response: YepApiResponse): boolean {
  return response.code === 200 && typeof response.data !== "string";
}

// Helper function to extract deal data from a success response
export function getDealDataFromResponse(response: YepApiResponse): YepApiSuccessData | null {
  if (isApiSuccessResponse(response)) {
    return response.data as YepApiSuccessData;
  }
  return null;
}
