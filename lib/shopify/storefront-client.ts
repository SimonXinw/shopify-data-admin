import "server-only";

import { isShopifyError } from "@/lib/shopify/type-guards";
import type { Cart, Connection, ProductVariant, ShopifyCart } from "@/lib/shopify/types-storefront";
import { getShopifyStorefrontRequestContextOrThrow } from "@/lib/shopify/storefront-credentials";

const removeEdgesAndNodes = <T>(array: Connection<T>) => {
  const result = array.edges.map((edge) => edge?.node);

  return result;
};

export const reshapeCart = (cart: ShopifyCart): Cart => {
  if (!cart.cost?.totalTaxAmount) {
    cart.cost.totalTaxAmount = {
      amount: "0.0",
      currencyCode: "USD",
    };
  }

  const lines = removeEdgesAndNodes(cart.lines);

  lines.forEach((lineItem) => {
    const variants = lineItem.merchandise?.product?.variants as unknown as Connection<ProductVariant>;

    if (variants && variants.edges) {
      lineItem.merchandise.product.variants = removeEdgesAndNodes(variants);
    }
  });

  return {
    ...cart,
    lines,
  };
};

export async function shopifyStorefrontFetch<T>({
  siteCode,
  cache = "force-cache",
  headers,
  query,
  tags,
  variables,
}: {
  siteCode: string;
  cache?: RequestCache;
  headers?: HeadersInit;
  query: string;
  tags?: string[];
  variables?: Record<string, unknown>;
}): Promise<{ status: number; body: T } | never> {
  try {
    const { endpoint, accessToken } = getShopifyStorefrontRequestContextOrThrow(siteCode);

    const result = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": accessToken,
        Connection: "keep-alive",
        ...headers,
      },
      body: JSON.stringify({
        ...(query && { query }),
        ...(variables && { variables }),
      }),
      cache,
      next: {
        ...(tags && { tags }),
      },
    });

    const body = (await result.json()) as T & { errors?: unknown };

    if (body.errors) {
      throw (body as { errors: unknown[] }).errors[0];
    }

    return {
      status: result.status,
      body,
    };
  } catch (e) {
    if (isShopifyError(e)) {
      throw {
        cause: e.cause?.toString() || "unknown",
        status: e.status || 500,
        message: e.message,
        query,
      };
    }

    throw {
      error: e,
      query,
    };
  }
}
