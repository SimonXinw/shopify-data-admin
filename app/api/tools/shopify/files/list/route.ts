import { NextResponse } from "next/server";

import { listSiteImages } from "@/lib/shopify/file-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { siteCode?: string; first?: number };
    const siteCode = String(body.siteCode ?? "").trim().toLowerCase();
    const firstRaw = Number(body.first ?? 250);
    const first = Number.isFinite(firstRaw) ? firstRaw : 250;

    if (!siteCode) {
      return NextResponse.json({ message: "缺少 siteCode 参数。" }, { status: 400 });
    }

    const items = await listSiteImages(siteCode, first);

    return NextResponse.json({
      siteCode,
      first: Math.min(250, Math.max(1, Math.floor(first))),
      count: items.length,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取文件列表失败";
    return NextResponse.json({ message }, { status: 500 });
  }
}
