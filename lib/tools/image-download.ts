export const DEFAULT_SHOPIFY_IMAGE_PREFIX = "https://awolvision.com/cdn/shop/files/";

const IMAGE_EXTENSION_PATTERN = /\.(webp|jpg|jpeg|png|gif|svg)(\?.*)?$/i;

export type MediaResourceType = "image" | "video";

export type ImageDownloadItem = {
  id: string;
  url: string;
  name: string;
  mediaType: MediaResourceType;
  size: number;
  sizeFormatted: string;
  error: boolean;
  isDownloading: boolean;
  isPrefetching: boolean;
  blob: Blob | null;
};

const IMAGE_MEDIA_EXTENSION_PATTERN = /\.(webp|jpe?g|png|gif|svg|avif|bmp|ico)(\?|#|$)/i;
const VIDEO_MEDIA_EXTENSION_PATTERN = /\.(mp4|webm|mov|m4v|ogv|m3u8)(\?|#|$)/i;
const BLOCKED_ASSET_EXTENSION_PATTERN =
  /\.(css|js|mjs|map|json|xml|txt|html?|htm|woff2?|ttf|eot|otf|pdf|zip|wasm|less|scss)(\?|#|$)/i;

const SHOPIFY_CDN_MEDIA_PATH_PATTERN =
  /\/cdn\/shop\/(files|products|articles|collections|t\/\d+\/)/i;

const SHOPIFY_FILES_CDN_PATTERN = /cdn\.shopify\.com\/s\/files\//i;

/** 服务端解析 HTML 时用于过滤非图片/视频静态资源（css、js、字体等）。 */
export const isAllowedMediaUrl = (url: string, fromMediaTag = false): boolean => {
  const lower = url.toLowerCase();

  if (BLOCKED_ASSET_EXTENSION_PATTERN.test(lower)) {
    return false;
  }

  if (IMAGE_MEDIA_EXTENSION_PATTERN.test(url) || VIDEO_MEDIA_EXTENSION_PATTERN.test(url)) {
    return true;
  }

  if (!fromMediaTag) {
    return false;
  }

  return SHOPIFY_CDN_MEDIA_PATH_PATTERN.test(url) || SHOPIFY_FILES_CDN_PATTERN.test(url);
};

export type PageMediaExtractResponse = {
  pageUrl: string;
  count: number;
  items: Array<{
    url: string;
    mediaType: MediaResourceType;
    name: string;
  }>;
  message?: string;
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (!Number(bytes)) {
    return "0 Bytes";
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const extractFilename = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let filename = pathname.substring(pathname.lastIndexOf("/") + 1);

    if (!filename) {
      filename = `image_${Date.now()}.jpg`;
    }

    return decodeURIComponent(filename.split("?")[0].split("#")[0]);
  } catch {
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1];

    return lastPart ? lastPart.split("?")[0].split("#")[0] : `image_${Date.now()}.jpg`;
  }
};

export const parseUrlInput = (input: string): string[] => {
  return input
    .split(/[\n,\s]+/)
    .map((url) => url.trim())
    .filter((url) => url !== "");
};

export const createImageItem = (
  url: string,
  mediaType: MediaResourceType = "image",
): ImageDownloadItem => {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    url,
    name: extractFilename(url),
    mediaType,
    size: 0,
    sizeFormatted: "",
    error: false,
    isDownloading: false,
    isPrefetching: true,
    blob: null,
  };
};

export const applyBlobToItem = (item: ImageDownloadItem, blob: Blob): ImageDownloadItem => {
  return {
    ...item,
    blob,
    size: blob.size,
    sizeFormatted: formatBytes(blob.size),
    isPrefetching: false,
  };
};

export const markPrefetchDone = (item: ImageDownloadItem): ImageDownloadItem => {
  return {
    ...item,
    isPrefetching: false,
  };
};

export const joinUrlsForClipboard = (urls: string[]): string => {
  return urls.join("\n");
};

export const normalizePrefixUrl = (prefix: string): string => {
  const trimmed = prefix.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
};

export const extractShopifyImageUrls = (
  jsonValue: unknown,
  prefix: string,
): string[] => {
  const urls: string[] = [];
  const normalizedPrefix = normalizePrefixUrl(prefix);

  const findUrls = (obj: unknown): void => {
    if (typeof obj === "string") {
      if (obj.startsWith("shopify://shop_images/")) {
        const filename = obj.replace("shopify://shop_images/", "");

        if (IMAGE_EXTENSION_PATTERN.test(filename)) {
          urls.push(`${normalizedPrefix}${filename}`);
        }
      }

      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) => findUrls(item));
      return;
    }

    if (obj !== null && typeof obj === "object") {
      Object.values(obj).forEach((value) => findUrls(value));
    }
  };

  findUrls(jsonValue);

  return [...new Set(urls)];
};

export const resolveUniqueZipFileName = (fileName: string, existingNames: Set<string>): string => {
  if (!existingNames.has(fileName)) {
    return fileName;
  }

  const nameParts = fileName.split(".");
  const ext = nameParts.length > 1 ? `.${nameParts.pop()}` : "";
  const baseName = nameParts.join(".");
  let counter = 1;
  let candidate = `${baseName}_${counter}${ext}`;

  while (existingNames.has(candidate)) {
    counter += 1;
    candidate = `${baseName}_${counter}${ext}`;
  }

  return candidate;
};
