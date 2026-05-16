import { VALERION_SHOPIFY_ENDPOINTS } from "@/src/consts/valerion/shopify/constants";

export const SHOPIFY_ADMIN_API_VERSION = "2025-10";

export const SHOPIFY_FILE_BATCH_LIMIT = 50;

/** 单次跨站「产品同步」请求最多处理的产品数量（避免超时与 Admin 限流）。 */
export const SHOPIFY_PRODUCT_SYNC_BATCH = 20;

/** 产品列表接口单次拉取上限（Admin `products` 查询）。 */
export const SHOPIFY_PRODUCT_LIST_LIMIT = 100;

/** `productVariantsBulkCreate` 单次变体条数上限（与 Shopify 文档一致，超出则拆分多次）。 */
export const SHOPIFY_PRODUCT_VARIANTS_BULK_CHUNK = 100;

export const SHOPIFY_ENDPOINT_PATHS = {
  adminGraphql: VALERION_SHOPIFY_ENDPOINTS.admin,
  storefrontGraphql: VALERION_SHOPIFY_ENDPOINTS.storefront,
} as const;

export const DEFAULT_UPLOAD_TIMEOUT_MS = 30_000;
