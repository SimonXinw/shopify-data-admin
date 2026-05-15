import { VALERION_SHOPIFY_ENDPOINTS } from "@/src/consts/valerion/shopify/constants";

export const SHOPIFY_ADMIN_API_VERSION = "2025-10";

export const SHOPIFY_FILE_BATCH_LIMIT = 50;

export const SHOPIFY_ENDPOINT_PATHS = {
  adminGraphql: VALERION_SHOPIFY_ENDPOINTS.admin,
} as const;

export const DEFAULT_UPLOAD_TIMEOUT_MS = 30_000;
