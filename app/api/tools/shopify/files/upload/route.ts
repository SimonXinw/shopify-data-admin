import { NextResponse } from "next/server";

import { buildRuntimeSiteConfigMap } from "@/lib/config/runtime-sites";
import { batchUploadFilesToShopify } from "@/lib/shopify/files";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const storeDomain = String(formData.get("storeDomain") ?? "").trim().toLowerCase();
    const altPrefix = String(formData.get("altPrefix") ?? "").trim();
    const customSiteConfigsRaw = String(formData.get("customSiteConfigs") ?? "").trim();
    const fileEntries = formData.getAll("files");
    const files = fileEntries.filter((item): item is File => item instanceof File);
    const customSiteConfigs = buildRuntimeSiteConfigMap(
      customSiteConfigsRaw ? JSON.parse(customSiteConfigsRaw) : {},
    );

    if (!storeDomain) {
      return NextResponse.json({ message: "缺少 storeDomain 参数。" }, { status: 400 });
    }

    const results = await batchUploadFilesToShopify({
      siteCode: storeDomain,
      files,
      altPrefix,
      customSiteConfigs,
    });

    const successCount = results.filter((item) => item.success).length;
    const failedCount = results.length - successCount;

    return NextResponse.json({
      successCount,
      failedCount,
      totalCount: results.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传流程异常";
    return NextResponse.json({ message }, { status: 500 });
  }
}
