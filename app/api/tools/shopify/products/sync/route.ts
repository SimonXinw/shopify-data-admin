import { NextResponse } from "next/server";

import { buildRuntimeSiteConfigMap } from "@/lib/config/runtime-sites";
import { syncProductsToSites } from "@/lib/shopify/product-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceStoreDomain?: string;
      targetStoreDomains?: string[];
      productIds?: string[];
      customSiteConfigs?: unknown;
    };

    const sourceStoreDomain = String(body.sourceStoreDomain ?? "").trim().toLowerCase();
    const targetStoreDomains = Array.isArray(body.targetStoreDomains)
      ? body.targetStoreDomains.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
      : [];
    const productIds = Array.isArray(body.productIds)
      ? body.productIds.map((id) => String(id).trim()).filter(Boolean)
      : [];
    const customSiteConfigs = buildRuntimeSiteConfigMap(body.customSiteConfigs);

    if (!sourceStoreDomain || targetStoreDomains.length < 1) {
      return NextResponse.json({ message: "缺少 sourceStoreDomain 或 targetStoreDomains 参数。" }, { status: 400 });
    }

    const results = await syncProductsToSites({
      sourceSiteCode: sourceStoreDomain,
      targetSiteCodes: targetStoreDomains,
      productIds,
      customSiteConfigs,
    });

    const successCount = results.filter((item) => item.success).length;
    const failedCount = results.length - successCount;

    return NextResponse.json({
      totalCount: results.length,
      successCount,
      failedCount,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "产品同步失败";
    return NextResponse.json({ message }, { status: 500 });
  }
}
