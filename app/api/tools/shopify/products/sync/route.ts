import { NextResponse } from "next/server";

import { syncProductsToSites } from "@/lib/shopify/product-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceSiteCode?: string;
      targetSiteCodes?: string[];
      productIds?: string[];
    };

    const sourceSiteCode = String(body.sourceSiteCode ?? "").trim().toLowerCase();
    const targetSiteCodes = Array.isArray(body.targetSiteCodes)
      ? body.targetSiteCodes.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
      : [];
    const productIds = Array.isArray(body.productIds)
      ? body.productIds.map((id) => String(id).trim()).filter(Boolean)
      : [];

    if (!sourceSiteCode || targetSiteCodes.length < 1) {
      return NextResponse.json({ message: "缺少 sourceSiteCode 或 targetSiteCodes 参数。" }, { status: 400 });
    }

    const results = await syncProductsToSites({
      sourceSiteCode,
      targetSiteCodes,
      productIds,
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
