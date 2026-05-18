import { NextResponse } from "next/server";

import { extractMediaFromHtml } from "@/lib/tools/image-download/extract-media-from-html";
import { fetchPageHtmlAsClient } from "@/lib/tools/image-download/fetch-page-html";

/** 仅抓取目标页 HTML 并解析媒体 URL，不下载图片/视频文件（文件流由用户浏览器直连 CDN）。 */
export const runtime = "nodejs";

const normalizePageUrl = (raw: string): string => {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error("缺少页面 URL。");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;

  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("页面 URL 格式无效。");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("仅支持 http/https 协议。");
  }

  return parsed.href;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const pageUrl = normalizePageUrl(String(body.url ?? ""));
    const { finalUrl, html } = await fetchPageHtmlAsClient(request, pageUrl);
    const items = extractMediaFromHtml(html, finalUrl);

    return NextResponse.json({
      pageUrl: finalUrl,
      count: items.length,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "页面媒体提取失败";

    return NextResponse.json({ message }, { status: 400 });
  }
}
