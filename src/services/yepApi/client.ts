import axios, { AxiosInstance } from "axios";
import { env } from "../../config/env.js";

export function createYepApi(): AxiosInstance {
  return axios.create({
    baseURL: env.YEP_API_BASE_URL,
    headers: {
      Cookie: env.YEP_API_COOKIE,
      Accept: "application/json",
    },
    timeout: 10000,
  });
}

export const yepApi = createYepApi();
