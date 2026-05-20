import { NextResponse } from "next/server";

import { buildRuntimeSiteConfigMap } from "@/lib/config/runtime-sites";
import { SHOPIFY_PRODUCT_LIST_LIMIT } from "@/lib/constants/shopify";
import { listSiteProducts } from "@/lib/shopify/product-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      storeDomain?: string;
      first?: number;
      query?: string;
      customSiteConfigs?: unknown;
    };
    const storeDomain = String(body.storeDomain ?? "").trim().toLowerCase();
    const firstRaw = Number(body.first ?? SHOPIFY_PRODUCT_LIST_LIMIT);
    const first = Number.isFinite(firstRaw) ? firstRaw : SHOPIFY_PRODUCT_LIST_LIMIT;
    const searchQuery = String(body.query ?? "").trim();
    const customSiteConfigs = buildRuntimeSiteConfigMap(body.customSiteConfigs);

    if (!storeDomain) {
      return NextResponse.json({ message: "缺少 storeDomain 参数。" }, { status: 400 });
    }

    const items = await listSiteProducts(storeDomain, {
      first,
      searchQuery: searchQuery.length > 0 ? searchQuery : undefined,
      customSiteConfigs,
    });

    return NextResponse.json({
      storeDomain,
      first: Math.min(SHOPIFY_PRODUCT_LIST_LIMIT, Math.max(1, Math.floor(first))),
      count: items.length,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取产品列表失败";
    return NextResponse.json({ message }, { status: 500 });
  }
}
