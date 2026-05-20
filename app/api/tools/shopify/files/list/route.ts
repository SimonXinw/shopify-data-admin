import { NextResponse } from "next/server";

import { buildRuntimeSiteConfigMap } from "@/lib/config/runtime-sites";
import { listSiteImages } from "@/lib/shopify/file-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { storeDomain?: string; first?: number; customSiteConfigs?: unknown };
    const storeDomain = String(body.storeDomain ?? "").trim().toLowerCase();
    const firstRaw = Number(body.first ?? 250);
    const first = Number.isFinite(firstRaw) ? firstRaw : 250;
    const customSiteConfigs = buildRuntimeSiteConfigMap(body.customSiteConfigs);

    if (!storeDomain) {
      return NextResponse.json({ message: "缺少 storeDomain 参数。" }, { status: 400 });
    }

    const items = await listSiteImages(storeDomain, first, { customSiteConfigs });

    return NextResponse.json({
      storeDomain,
      first: Math.min(250, Math.max(1, Math.floor(first))),
      count: items.length,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取文件列表失败";
    return NextResponse.json({ message }, { status: 500 });
  }
}
