import "server-only";

import { SHOPIFY_ENDPOINT_PATHS } from "@/lib/constants/shopify";
import { getSiteConfigOrThrow, type SiteCode } from "@/lib/config/sites";

function toEnvPrefix(code: SiteCode): string {
  return code.toUpperCase();
}

function readEnv(prefix: string, suffix: string): string {
  return (process.env[`${prefix}_${suffix}`] ?? "").trim();
}

export type ShopifyStorefrontRequestContext = {
  endpoint: string;
  accessToken: string;
};

/**
 * 读取站点 Storefront API 凭证（依赖已配置的 SHOPIFY_STORE_DOMAIN 与 SHOPIFY_STOREFRONT_ACCESS_TOKEN）。
 */
export function getShopifyStorefrontRequestContextOrThrow(
  siteCodeRaw: string
): ShopifyStorefrontRequestContext {
  const siteConfig = getSiteConfigOrThrow(siteCodeRaw);
  const prefix = toEnvPrefix(siteConfig.code);
  const accessToken = readEnv(prefix, "SHOPIFY_STOREFRONT_ACCESS_TOKEN");

  if (!accessToken) {
    throw new Error(`站点 ${siteConfig.code} 缺少 SHOPIFY_STOREFRONT_ACCESS_TOKEN`);
  }

  const endpoint = `https://${siteConfig.storeDomain}${SHOPIFY_ENDPOINT_PATHS.storefrontGraphql}`;

  return {
    endpoint,
    accessToken,
  };
}
