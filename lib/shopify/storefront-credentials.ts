import "server-only";

import { SHOPIFY_ENDPOINT_PATHS } from "@/lib/constants/shopify";
import { getSiteConfigOrThrow } from "@/lib/config/sites";

function readEnvByName(envName: string): string {
  return (process.env[envName] ?? "").trim();
}

export type ShopifyStorefrontRequestContext = {
  endpoint: string;
  accessToken: string;
};

/**
 * 读取站点 Storefront API 凭证（依赖已配置的 SHOPIFY_STORE_DOMAIN 与 SHOPIFY_STOREFRONT_ACCESS_TOKEN）。
 */
export function getShopifyStorefrontRequestContextOrThrow(
  storeDomainRaw: string
): ShopifyStorefrontRequestContext {
  const siteConfig = getSiteConfigOrThrow(storeDomainRaw);
  const accessToken = readEnvByName(siteConfig.storefrontAccessTokenEnvName);

  if (!accessToken) {
    throw new Error(`店铺 ${siteConfig.label} 缺少环境变量 ${siteConfig.storefrontAccessTokenEnvName}`);
  }

  const endpoint = `https://${siteConfig.storeDomain}${SHOPIFY_ENDPOINT_PATHS.storefrontGraphql}`;

  return {
    endpoint,
    accessToken,
  };
}
