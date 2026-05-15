import { NextResponse } from "next/server";

import { syncImagesToSite } from "@/lib/shopify/file-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceSiteCode?: string;
      targetSiteCode?: string;
      targetSiteCodes?: string[];
      fileIds?: string[];
    };

    const sourceSiteCode = String(body.sourceSiteCode ?? "").trim().toLowerCase();
    const targetSiteCodes = Array.isArray(body.targetSiteCodes)
      ? body.targetSiteCodes
          .map((code) => String(code).trim().toLowerCase())
          .filter((code) => code.length > 0)
      : [];
    const fallbackTargetSiteCode = String(body.targetSiteCode ?? "").trim().toLowerCase();
    const normalizedTargetSiteCodes = Array.from(
      new Set(
        targetSiteCodes.length > 0
          ? targetSiteCodes
          : fallbackTargetSiteCode
            ? [fallbackTargetSiteCode]
            : [],
      ),
    );
    const fileIds = Array.isArray(body.fileIds)
      ? body.fileIds
          .map((id) => String(id).trim())
          .filter((id) => id.length > 0)
      : [];

    if (!sourceSiteCode || normalizedTargetSiteCodes.length < 1) {
      return NextResponse.json(
        { message: "缺少 sourceSiteCode 或 targetSiteCodes 参数。" },
        { status: 400 },
      );
    }

    const results = await syncImagesToSite({
      sourceSiteCode,
      targetSiteCodes: normalizedTargetSiteCodes,
      fileIds,
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
