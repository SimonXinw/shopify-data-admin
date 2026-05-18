const JSZIP_CDN_URLS = [
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
] as const;

type JSZipInstance = {
  file: (path: string, data?: Blob) => unknown;
  generateAsync: (options: { type: "blob" }) => Promise<Blob>;
};

export type JSZipConstructor = new () => JSZipInstance;

export type ImageDownloadRuntime = {
  jszip: JSZipConstructor;
};

type RuntimeSnapshot = {
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
};

declare global {
  interface Window {
    JSZip?: JSZipConstructor;
  }
}

let jsZipPromise: Promise<JSZipConstructor> | null = null;
let snapshot: RuntimeSnapshot = { status: "idle", error: null };
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const setSnapshot = (next: RuntimeSnapshot) => {
  snapshot = next;
  emit();
};

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }

    const script = existing ?? document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.loaded = "false";

    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", () => reject(new Error(`JSZip CDN 加载失败: ${src}`)), {
      once: true,
    });

    if (!existing) {
      document.head.appendChild(script);
    }
  });
};

const loadJsZipFromCdns = async (): Promise<JSZipConstructor> => {
  if (window.JSZip) {
    return window.JSZip;
  }

  let lastError: unknown;

  for (const url of JSZIP_CDN_URLS) {
    try {
      await loadScript(url);

      if (window.JSZip) {
        return window.JSZip;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("JSZip 加载失败");
};

export const preloadJsZip = (): Promise<JSZipConstructor> => {
  if (!jsZipPromise) {
    setSnapshot({ status: "loading", error: null });
    jsZipPromise = loadJsZipFromCdns().catch((error) => {
      jsZipPromise = null;
      setSnapshot({
        status: "error",
        error: error instanceof Error ? error.message : "JSZip 加载失败",
      });
      throw error;
    });

    jsZipPromise.then(() => {
      setSnapshot({ status: "ready", error: null });
    });
  }

  return jsZipPromise;
};

export const getJsZip = (): Promise<JSZipConstructor> => preloadJsZip();

export const imageDownloadRuntime = {
  preload: async () => {
    await preloadJsZip();
  },
  retry: async () => {
    jsZipPromise = null;
    await preloadJsZip();
  },
  getSnapshot: () => snapshot,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getAll: async (): Promise<ImageDownloadRuntime> => ({ jszip: await getJsZip() }),
};
