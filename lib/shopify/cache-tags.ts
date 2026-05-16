/**
 * Next.js `fetch` 缓存标签（与 valerion 中 TAGS 语义对齐，供 Storefront 请求复用）。
 */
export const STOREFRONT_CACHE_TAGS = {
  cart: "cart",
  collections: "collections",
  products: "products",
} as const;
