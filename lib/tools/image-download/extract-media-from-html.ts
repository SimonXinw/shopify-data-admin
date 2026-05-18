import "server-only";

import * as cheerio from "cheerio";

import {
  extractFilename,
  isAllowedMediaUrl,
  type MediaResourceType,
} from "@/lib/tools/image-download";

export type ExtractedPageMedia = {
  url: string;
  mediaType: MediaResourceType;
  name: string;
};

const LAZY_SRC_ATTRIBUTES = [
  "src",
  "data-src",
  "data-original",
  "data-lazy-src",
  "data-image",
] as const;

const isSkippableUrl = (raw: string): boolean => {
  const value = raw.trim().toLowerCase();

  return (
    value === "" ||
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith("javascript:") ||
    value.startsWith("#")
  );
};

const resolveAbsoluteUrl = (baseUrl: string, raw: string): string | null => {
  if (isSkippableUrl(raw)) {
    return null;
  }

  try {
    return new URL(raw.trim(), baseUrl).href;
  } catch {
    return null;
  }
};

const inferMediaType = (url: string): MediaResourceType => {
  if (/\.(mp4|webm|mov|m4v|ogv|m3u8)(\?|#|$)/i.test(url)) {
    return "video";
  }

  return "image";
};

const parseSrcset = (value: string, baseUrl: string): string[] => {
  const urls: string[] = [];

  value.split(",").forEach((segment) => {
    const candidate = segment.trim().split(/\s+/)[0];

    if (!candidate) {
      return;
    }

    const resolved = resolveAbsoluteUrl(baseUrl, candidate);

    if (resolved) {
      urls.push(resolved);
    }
  });

  return urls;
};

const collectUrlsFromJson = (value: unknown, baseUrl: string, bucket: Set<string>): void => {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) {
      const resolved = resolveAbsoluteUrl(baseUrl, value);

      if (resolved && isAllowedMediaUrl(resolved)) {
        bucket.add(resolved);
      }
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectUrlsFromJson(item, baseUrl, bucket));
    return;
  }

  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((item) => collectUrlsFromJson(item, baseUrl, bucket));
  }
};

const pushMedia = (
  rawUrl: string,
  mediaType: MediaResourceType | "auto",
  baseUrl: string,
  fromMediaTag: boolean,
  seen: Set<string>,
  items: ExtractedPageMedia[],
): void => {
  const resolved = resolveAbsoluteUrl(baseUrl, rawUrl);

  if (!resolved || seen.has(resolved) || !isAllowedMediaUrl(resolved, fromMediaTag)) {
    return;
  }

  seen.add(resolved);

  const resolvedType = mediaType === "auto" ? inferMediaType(resolved) : mediaType;

  items.push({
    url: resolved,
    mediaType: resolvedType,
    name: extractFilename(resolved),
  });
};

export const extractMediaFromHtml = (html: string, pageUrl: string): ExtractedPageMedia[] => {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const items: ExtractedPageMedia[] = [];

  $("img, picture source, video, audio").each((_, element) => {
    const tag = element.tagName?.toLowerCase() ?? "";
    const isVideoTag = tag === "video" || tag === "audio";

    LAZY_SRC_ATTRIBUTES.forEach((attr) => {
      const value = $(element).attr(attr);

      if (value) {
        pushMedia(value, isVideoTag ? "video" : "auto", pageUrl, true, seen, items);
      }
    });

    const srcset = $(element).attr("srcset") ?? $(element).attr("data-srcset");

    if (srcset) {
      parseSrcset(srcset, pageUrl).forEach((url) => {
        pushMedia(url, isVideoTag ? "video" : "auto", pageUrl, true, seen, items);
      });
    }

    if (tag === "video") {
      const poster = $(element).attr("poster");

      if (poster) {
        pushMedia(poster, "image", pageUrl, true, seen, items);
      }
    }
  });

  $("meta").each((_, element) => {
    const property = ($(element).attr("property") ?? $(element).attr("name") ?? "").toLowerCase();
    const content = $(element).attr("content");

    if (!content) {
      return;
    }

    if (
      property === "og:image" ||
      property === "og:image:url" ||
      property === "twitter:image" ||
      property === "twitter:image:src"
    ) {
      pushMedia(content, "image", pageUrl, true, seen, items);
    }

    if (property === "og:video" || property === "og:video:url" || property === "twitter:player:stream") {
      pushMedia(content, "video", pageUrl, true, seen, items);
    }
  });

  $("script[type='application/ld+json']").each((_, element) => {
    const raw = $(element).text().trim();

    if (!raw) {
      return;
    }

    try {
      const jsonValue = JSON.parse(raw) as unknown;
      const jsonBucket = new Set<string>();

      collectUrlsFromJson(jsonValue, pageUrl, jsonBucket);
      jsonBucket.forEach((url) => pushMedia(url, "auto", pageUrl, false, seen, items));
    } catch {
      // 非 JSON 的 script 内容忽略，避免误抓 js 片段里的字符串
    }
  });

  return items.sort((left, right) => {
    if (left.mediaType !== right.mediaType) {
      return left.mediaType === "image" ? -1 : 1;
    }

    return left.url.localeCompare(right.url);
  });
};
