import "server-only";

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
  siteCode,
  query,
  variables,
}: {
  siteCode: string;
  query: string;
  variables?: Record<string, unknown>;
}): Promise<TData> {
  const siteConfig = getSiteConfigOrThrow(siteCode);
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
