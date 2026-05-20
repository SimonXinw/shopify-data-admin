import { NextResponse } from "next/server";

import { buildRuntimeSiteConfigMap } from "@/lib/config/runtime-sites";
import { syncImagesToSite } from "@/lib/shopify/file-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceStoreDomain?: string;
      targetStoreDomains?: string[];
      fileIds?: string[];
      customSiteConfigs?: unknown;
    };

    const sourceStoreDomain = String(body.sourceStoreDomain ?? "").trim().toLowerCase();
    const targetStoreDomains = Array.isArray(body.targetStoreDomains)
      ? body.targetStoreDomains
          .map((code) => String(code).trim().toLowerCase())
          .filter((code) => code.length > 0)
      : [];
    const normalizedTargetStoreDomains = Array.from(new Set(targetStoreDomains));
    const fileIds = Array.isArray(body.fileIds)
      ? body.fileIds
          .map((id) => String(id).trim())
          .filter((id) => id.length > 0)
      : [];
    const customSiteConfigs = buildRuntimeSiteConfigMap(body.customSiteConfigs);

    if (!sourceStoreDomain || normalizedTargetStoreDomains.length < 1) {
      return NextResponse.json(
        { message: "缺少 sourceStoreDomain 或 targetStoreDomains 参数。" },
        { status: 400 },
      );
    }

    const results = await syncImagesToSite({
      sourceSiteCode: sourceStoreDomain,
      targetSiteCodes: normalizedTargetStoreDomains,
      fileIds,
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
    const message = error instanceof Error ? error.message : "批量同步失败";
    return NextResponse.json({ message }, { status: 500 });
  }
}
