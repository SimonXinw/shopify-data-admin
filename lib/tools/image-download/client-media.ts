/**
 * 与 Vue 静态页相同：fetch(cors) 预拉 blob → 浏览器本地保存。
 * 保存使用原生 Blob URL，避免为单张下载引入额外运行时。
 */

export const fetchMediaBlob = async (url: string): Promise<Blob | null> => {
  try {
    const response = await fetch(url, { mode: "cors" });

    if (!response.ok) {
      return null;
    }

    return response.blob();
  } catch {
    return null;
  }
};

export const resolveMediaBlob = async (
  url: string,
  cachedBlob: Blob | null,
): Promise<Blob | null> => {
  if (cachedBlob) {
    return cachedBlob;
  }

  return fetchMediaBlob(url);
};

export const saveBlobToDisk = (blob: Blob, fileName: string): void => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
};

export const downloadViaAnchor = (url: string, fileName: string): void => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

export type DownloadMediaResult = {
  blob: Blob | null;
  usedAnchorFallback: boolean;
};

export const downloadMediaItem = async (item: {
  url: string;
  name: string;
  blob: Blob | null;
}): Promise<DownloadMediaResult> => {
  const blob = item.blob ?? (await fetchMediaBlob(item.url));

  if (blob) {
    saveBlobToDisk(blob, item.name);
    return { blob, usedAnchorFallback: false };
  }

  downloadViaAnchor(item.url, item.name);
  return { blob: null, usedAnchorFallback: true };
};

const DEFAULT_PREFETCH_CONCURRENCY = 4;

export const prefetchMediaBlobsInBatches = async (
  entries: Array<{ id: string; url: string }>,
  onBlob: (id: string, blob: Blob) => void,
  concurrency = DEFAULT_PREFETCH_CONCURRENCY,
): Promise<void> => {
  for (let index = 0; index < entries.length; index += concurrency) {
    const batch = entries.slice(index, index + concurrency);

    await Promise.all(
      batch.map(async (entry) => {
        const blob = await fetchMediaBlob(entry.url);

        if (blob) {
          onBlob(entry.id, blob);
        }
      }),
    );
  }
};
