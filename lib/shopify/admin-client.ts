import "server-only";

import { type RuntimeSiteConfigMap, normalizeStoreDomain } from "@/lib/config/runtime-sites";
import { SHOPIFY_ENDPOINT_PATHS } from "@/lib/constants/shopify";
import { getSiteConfigOrThrow } from "@/lib/config/sites";

type GraphqlError = {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
};

type GraphqlResponse<TData> = {
  data?: TData;
  errors?: GraphqlError[];
};

export async function shopifyAdminRequest<TData>({
  storeDomain,
  query,
  variables,
  customSiteConfigs,
}: {
  storeDomain: string;
  query: string;
  variables?: Record<string, unknown>;
  customSiteConfigs?: RuntimeSiteConfigMap;
}): Promise<TData> {
  const normalizedStoreDomain = normalizeStoreDomain(storeDomain);
  let siteConfig:
    | {
        label: string;
        storeDomain: string;
        adminAccessToken: string;
      }
    | null = null;

  const customSiteConfig = customSiteConfigs?.[normalizedStoreDomain];
  if (customSiteConfig) {
    siteConfig = {
      label: customSiteConfig.label?.trim() || normalizedStoreDomain,
      storeDomain: normalizeStoreDomain(customSiteConfig.storeDomain),
      adminAccessToken: customSiteConfig.adminAccessToken.trim(),
    };
  } else {
    const fromEnv = getSiteConfigOrThrow(normalizedStoreDomain);
    siteConfig = {
      label: fromEnv.label,
      storeDomain: normalizeStoreDomain(fromEnv.storeDomain),
      adminAccessToken: fromEnv.adminAccessToken.trim(),
    };
  }

  if (!siteConfig || !siteConfig.storeDomain || !siteConfig.adminAccessToken) {
    throw new Error(`店铺 ${normalizedStoreDomain} 缺少有效的店铺域名或 Admin Token。`);
  }
  const endpoint = `https://${siteConfig.storeDomain}${SHOPIFY_ENDPOINT_PATHS.adminGraphql}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": siteConfig.adminAccessToken,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as GraphqlResponse<TData>;

  if (!response.ok) {
    const message = payload.errors?.[0]?.message ?? `Shopify 请求失败，HTTP ${response.status}`;
    throw new Error(message);
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message);
  }

  if (!payload.data) {
    throw new Error("Shopify 返回数据为空");
  }

  return payload.data;
}
