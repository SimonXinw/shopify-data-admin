import { NextResponse } from "next/server";

import { batchUploadFilesToShopify } from "@/lib/shopify/files";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const siteCode = String(formData.get("siteCode") ?? "").trim().toLowerCase();
    const altPrefix = String(formData.get("altPrefix") ?? "").trim();
    const fileEntries = formData.getAll("files");
    const files = fileEntries.filter((item): item is File => item instanceof File);

    if (!siteCode) {
      return NextResponse.json({ message: "缺少 siteCode 参数。" }, { status: 400 });
    }

    const results = await batchUploadFilesToShopify({
      siteCode,
      files,
      altPrefix,
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
