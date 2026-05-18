import "server-only";

const FETCH_TIMEOUT_MS = 30_000;
const MAX_HTML_BYTES = 8 * 1024 * 1024;

const FORWARDED_REQUEST_HEADERS = [
  "user-agent",
  "accept",
  "accept-language",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-fetch-user",
  "upgrade-insecure-requests",
] as const;

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const buildClientLikeHeaders = (request: Request, targetUrl: string): Headers => {
  const headers = new Headers();

  FORWARDED_REQUEST_HEADERS.forEach((name) => {
    const value = request.headers.get(name);

    if (value) {
      headers.set(name, value);
    }
  });

  if (!headers.has("user-agent")) {
    headers.set("user-agent", DEFAULT_USER_AGENT);
  }

  if (!headers.has("accept")) {
    headers.set(
      "accept",
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    );
  }

  if (!headers.has("accept-language")) {
    headers.set("accept-language", "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7");
  }

  try {
    const origin = new URL(targetUrl);
    headers.set("referer", `${origin.protocol}//${origin.host}/`);
  } catch {
    // ignore invalid target url
  }

  return headers;
};

const readResponseTextWithLimit = async (response: Response): Promise<string> => {
  const reader = response.body?.getReader();

  if (!reader) {
    return response.text();
  }

  const decoder = new TextDecoder();
  let totalBytes = 0;
  let html = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > MAX_HTML_BYTES) {
      throw new Error("页面 HTML 体积过大，已中止解析。");
    }

    html += decoder.decode(value, { stream: true });
  }

  html += decoder.decode();

  return html;
};

export type FetchedPageHtml = {
  finalUrl: string;
  html: string;
};

export const fetchPageHtmlAsClient = async (
  request: Request,
  targetUrl: string,
): Promise<FetchedPageHtml> => {
  const headers = buildClientLikeHeaders(request, targetUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`页面请求失败（HTTP ${response.status}）`);
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error(`目标 URL 返回的不是 HTML 页面（Content-Type: ${contentType}）`);
    }

    const html = await readResponseTextWithLimit(response);

    return {
      finalUrl: response.url || targetUrl,
      html,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("页面请求超时，请稍后重试。");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
