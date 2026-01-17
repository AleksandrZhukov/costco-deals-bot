import axios from "axios";
import { yepApi } from "./client.js";
import {
  safeParseYepApiResponse,
  isApiSuccessResponse,
  getDealDataFromResponse,
  type YepApiResponse,
  type YepDealItem,
} from "../../types/yepApi.js";

export interface FetchDealsOptions {
  storeId: number;
  page?: number;
  pageSize?: number;
}

export interface FetchDealsResult {
  success: boolean;
  data?: YepApiResponse;
  deals?: YepDealItem[];
  error?: string;
}

const API_PATH = "/api/deal/list";

export async function fetchDealsForStore(
  options: FetchDealsOptions
): Promise<FetchDealsResult> {
  const { storeId, page = 1, pageSize = 20 } = options;

  try {
    const response = await yepApi.get(API_PATH, {
      params: {
        storeId,
        page,
        pageSize,
      },
    });

    const validationResult = safeParseYepApiResponse(response.data);

    if (!validationResult.success || !validationResult.data) {
      return {
        success: false,
        error: `API response validation failed: ${validationResult.error?.message ?? "Unknown validation error"}`,
      };
    }

    // Check if API returned an error (non-200 code or string data)
    if (!isApiSuccessResponse(validationResult.data)) {
      return {
        success: false,
        error: `API error: ${validationResult.data.message}`,
      };
    }

    const dealData = getDealDataFromResponse(validationResult.data);

    return {
      success: true,
      data: validationResult.data,
      deals: dealData?.goods,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: `API request failed: ${error.message}`,
      };
    }

    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
