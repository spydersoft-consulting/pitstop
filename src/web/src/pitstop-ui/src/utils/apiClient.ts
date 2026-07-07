import axios from "axios";
import { getConfig } from "./Config";

export function createApiClient(accessToken?: string) {
  const instance = axios.create({
    baseURL: getConfig("api_url"),
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
  });
  return instance;
}
