"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckSquare,
  ClipboardCopy,
  Code2,
  Download,
  Film,
  ImageIcon,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  downloadMediaItem,
  prefetchMediaBlobsInBatches,
  resolveMediaBlob,
  saveBlobToDisk,
} from "@/lib/tools/image-download/client-media";
import { getJsZip, preloadJsZip } from "@/lib/tools/image-download/runtime";
import {
  applyBlobToItem,
  createImageItem,
  DEFAULT_SHOPIFY_IMAGE_PREFIX,
  extractShopifyImageUrls,
  joinUrlsForClipboard,
  markPrefetchDone,
  parseUrlInput,
  resolveUniqueZipFileName,
  type ImageDownloadItem,
  type PageMediaExtractResponse,
} from "@/lib/tools/image-download";
type MediaCardProps = {
  item: ImageDownloadItem;
  checked: boolean;
  onToggle: (id: string) => void;
  onError: (id: string) => void;
  onDownload: (item: ImageDownloadItem) => void;
};

const MediaCard = memo(function MediaCard({
  item,
  checked,
  onToggle,
  onError,
  onDownload,
}: MediaCardProps) {
  return (
    <article
      onClick={() => onToggle(item.id)}
      className={`group flex min-w-[min(100%,320px)] flex-1 cursor-pointer basis-[320px] items-stretch gap-2 rounded-xl border px-2 py-2 transition-[border-color,background-color,box-shadow] duration-150 hover:shadow-sm ${
        checked
          ? "border-indigo-400 bg-indigo-50/40 ring-1 ring-indigo-400/20"
          : "border-zinc-200 bg-white"
      }`}
    >
      <label
        className="flex shrink-0 cursor-pointer items-center px-1"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(item.id)}
          className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-indigo-600 shadow-sm transition-colors focus:ring-indigo-500 focus:ring-offset-0"
        />
      </label>

      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-100">
        {!item.error ? (
          item.mediaType === "video" ? (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              <Film className="h-6 w-6" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- 远程 URL 预览
            <img
              src={item.url}
              alt={item.name}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => onError(item.id)}
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-red-400">
            <AlertCircle className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-0.5">
        <p className="break-all font-mono text-[11px] leading-snug text-zinc-700" title={item.url}>
          {item.url}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-500">
            {item.sizeFormatted || (item.isPrefetching ? "加载中…" : "大小未知")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 px-2.5 text-xs"
            disabled={item.error || item.isDownloading}
            onClick={(event) => {
              event.stopPropagation();
              onDownload(item);
            }}
          >
            {item.isDownloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            下载
          </Button>
        </div>
      </div>
    </article>
  );
});

export function ImageDownloadToolClient() {
  const [pageUrlInput, setPageUrlInput] = useState("");
  const [lastExtractedPageUrl, setLastExtractedPageUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const [images, setImages] = useState<ImageDownloadItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);

  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonPrefixUrl, setJsonPrefixUrl] = useState(DEFAULT_SHOPIFY_IMAGE_PREFIX);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;
  const hasImages = images.length > 0;
  const allSelected = hasImages && selectedCount === images.length;

  useEffect(() => {
    void preloadJsZip();
  }, []);

  const prefetchBlobsForItems = useCallback((items: ImageDownloadItem[]) => {
    void prefetchMediaBlobsInBatches(
      items.map((item) => ({ id: item.id, url: item.url })),
      (id, blob) => {
        setImages((prev) =>
          prev.map((img) => (img.id === id ? applyBlobToItem(img, blob) : img)),
        );
      },
    ).then(() => {
      setImages((prev) =>
        prev.map((img) => {
          const inBatch = items.some((item) => item.id === img.id);

          if (!inBatch || img.blob) {
            return img;
          }

          return markPrefetchDone(img);
        }),
      );
    });
  }, []);

  const hydrateItems = useCallback(
    (items: ImageDownloadItem[]) => {
      setImages(items);
      setSelectedIds(items.map((item) => item.id));
      prefetchBlobsForItems(items);
    },
    [prefetchBlobsForItems],
  );

  const appendUrls = useCallback(
    (urls: string[]) => {
      if (urls.length === 0) {
        return;
      }

      const newItems = urls.map((url) => createImageItem(url));

      setImages((prev) => [...prev, ...newItems]);
      setSelectedIds((prev) => [...prev, ...newItems.map((item) => item.id)]);
      prefetchBlobsForItems(newItems);
    },
    [prefetchBlobsForItems],
  );

  const handleExtractPageMedia = async () => {
    const targetUrl = pageUrlInput.trim();

    if (!targetUrl) {
      toast.error("请输入要抓取的页面 URL");
      return;
    }

    setIsExtracting(true);

    try {
      const response = await fetch("/api/tools/page-media/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const payload = (await response.json()) as PageMediaExtractResponse;

      if (!response.ok) {
        toast.error(payload.message ?? "页面媒体提取失败");
        return;
      }

      if (payload.count < 1) {
        setImages([]);
        setSelectedIds([]);
        setLastExtractedPageUrl(payload.pageUrl);
        toast.warning("页面中未找到图片或视频资源");
        return;
      }

      const nextItems = payload.items.map((item) =>
        createImageItem(item.url, item.mediaType),
      );

      hydrateItems(nextItems);
      setLastExtractedPageUrl(payload.pageUrl);
      toast.success(`已从页面提取 ${payload.count} 个媒体资源`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "网络请求失败";
      toast.error(message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleProcessUrls = () => {
    if (!urlInput.trim()) {
      setShowUrlDialog(false);
      return;
    }

    const urls = parseUrlInput(urlInput);
    appendUrls(urls);
    setUrlInput("");
    setShowUrlDialog(false);

    if (urls.length > 0) {
      toast.success(`已添加 ${urls.length} 个链接`);
    }
  };

  const handleProcessJson = async () => {
    if (!jsonInput.trim()) {
      toast.error("请输入 JSON 内容");
      return;
    }

    try {
      const jsonObj = JSON.parse(jsonInput) as unknown;
      const urls = extractShopifyImageUrls(jsonObj, jsonPrefixUrl);

      if (urls.length === 0) {
        toast.error(
          "未找到符合 shopify://shop_images/ 格式且为常见图片类型（webp/jpg/png/svg 等）的链接",
        );
        return;
      }

      const resultText = joinUrlsForClipboard(urls);

      try {
        await navigator.clipboard.writeText(resultText);
        toast.success(`成功提取并复制了 ${urls.length} 个图片链接，可直接粘贴到「手动添加 URL」中使用`);
        setShowJsonDialog(false);
        setJsonInput("");
      } catch {
        setJsonInput(resultText);
        toast.warning(
          `提取成功 ${urls.length} 个链接，但自动复制失败。链接已填入文本框，请手动复制。`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.error(`JSON 解析失败，请检查输入格式是否正确：${message}`);
    }
  };

  const handleImageError = (itemId: string) => {
    setImages((prev) => prev.map((img) => (img.id === itemId ? { ...img, error: true } : img)));
  };

  const handleReloadBlobs = () => {
    const reloaded = images.map((img) => ({
      ...createImageItem(img.url, img.mediaType),
      id: img.id,
    }));

    setImages(reloaded);
    prefetchBlobsForItems(reloaded);
    toast.info("正在重新拉取文件");
  };

  const handleClearImages = () => {
    setImages([]);
    setSelectedIds([]);
    setLastExtractedPageUrl("");
    toast.success("已清除列表");
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(images.map((item) => item.id));
  };

  const handleCopyUrls = async (onlySelected: boolean) => {
    const targets = onlySelected
      ? images.filter((item) => selectedIdSet.has(item.id))
      : images;

    if (targets.length < 1) {
      toast.error(onlySelected ? "请先选择要复制的资源" : "当前没有可复制的 URL");
      return;
    }

    const text = joinUrlsForClipboard(targets.map((item) => item.url));

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`已复制 ${targets.length} 个 URL`);
    } catch {
      toast.error("复制失败，请检查浏览器剪贴板权限");
    }
  };

  const handleDownloadSingle = async (item: ImageDownloadItem) => {
    if (item.error) {
      return;
    }

    setImages((prev) =>
      prev.map((img) => (img.id === item.id ? { ...img, isDownloading: true } : img)),
    );

    try {
      const { blob, usedAnchorFallback } = await downloadMediaItem({
        url: item.url,
        name: item.name,
        blob: item.blob,
      });

      if (blob && !item.blob) {
        setImages((prev) =>
          prev.map((img) => (img.id === item.id ? applyBlobToItem(img, blob) : img)),
        );
      }

      if (usedAnchorFallback) {
        toast.info("已尝试通过链接下载；若未保存成功，请在新标签页中右键另存为");
      }
    } catch {
      toast.warning("下载失败，请稍后重试或检查网络");
    } finally {
      setImages((prev) =>
        prev.map((img) => (img.id === item.id ? { ...img, isDownloading: false } : img)),
      );
    }
  };

  const downloadItemsAsZip = async (targets: ImageDownloadItem[]) => {
    const validImages = targets.filter((img) => !img.error);

    if (validImages.length === 0) {
      toast.error("没有可下载的资源");
      return;
    }

    setIsDownloadingBatch(true);

    try {
      const JSZip = await getJsZip();
      const zip = new JSZip();
      const usedNames = new Set<string>();
      let hasFiles = false;
      let failCount = 0;

      await Promise.all(
        validImages.map(async (img) => {
          try {
            const blob = await resolveMediaBlob(img.url, img.blob);

            if (!blob) {
              failCount += 1;
              return;
            }

            const fileName = resolveUniqueZipFileName(img.name, usedNames);
            usedNames.add(fileName);
            zip.file(fileName, blob);
            hasFiles = true;

            if (!img.blob) {
              setImages((prev) =>
                prev.map((entry) => (entry.id === img.id ? applyBlobToItem(entry, blob) : entry)),
              );
            }
          } catch {
            failCount += 1;
          }
        }),
      );

      if (!hasFiles) {
        toast.error("由于跨域限制，无法进行批量打包下载，请尝试单张下载");
        return;
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveBlobToDisk(content, "images_batch_download.zip");

      if (failCount > 0) {
        toast.warning(`批量下载完成，但有 ${failCount} 张图片因跨域限制未能打包`);
      } else {
        toast.success("批量下载完成");
      }
    } catch {
      toast.error("批量下载失败，请检查网络或跨域限制");
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  const handleBatchDownload = async () => {
    const targets =
      selectedCount > 0 ? images.filter((item) => selectedIdSet.has(item.id)) : images;

    await downloadItemsAsZip(targets);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
      <header className="sticky top-0 z-20 rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-900 sm:text-xl">页面媒体提取</h1>
                <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
                  输入页面 URL，由服务端模拟浏览器抓取 SSR 页面并提取图片 / 视频链接
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowJsonDialog(true)}
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <Code2 className="h-4 w-4" />
                JSON 提取
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowUrlDialog(true)}
              >
                <Link2 className="h-4 w-4" />
                手动 URL
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="url"
              value={pageUrlInput}
              onChange={(event) => setPageUrlInput(event.target.value)}
              placeholder="https://example.com/products/xxx"
              className="h-10 flex-1 font-mono text-sm"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleExtractPageMedia();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="h-10 shrink-0 bg-zinc-900 hover:bg-zinc-700"
              disabled={isExtracting}
              onClick={() => void handleExtractPageMedia()}
            >
              {isExtracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              提取资源
            </Button>
          </div>

          {lastExtractedPageUrl && (
            <p className="truncate text-xs text-zinc-500" title={lastExtractedPageUrl}>
              最近抓取：{lastExtractedPageUrl}
            </p>
          )}

          {hasImages && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                <span>
                  共 <span className="font-medium text-zinc-800">{images.length}</span> 项
                </span>
                <span className="text-zinc-300">·</span>
                <span>
                  已选 <span className="font-medium text-indigo-600">{selectedCount}</span>
                </span>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <Button type="button" variant="outline" size="sm" onClick={toggleSelectAll}>
                  {allSelected ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <CheckSquare className="h-4 w-4" />
                  )}
                  {allSelected ? "取消全选" : "全选"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopyUrls(false)}
                >
                  <ClipboardCopy className="h-4 w-4" />
                  复制全部 URL
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectedCount < 1}
                  onClick={() => void handleCopyUrls(true)}
                >
                  <ClipboardCopy className="h-4 w-4" />
                  复制已选
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleReloadBlobs}>
                  <RefreshCw className="h-4 w-4" />
                  重新加载
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearImages}
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                  清除列表
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={isDownloadingBatch}
                  onClick={() => void handleBatchDownload()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isDownloadingBatch ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {selectedCount > 0 ? "下载已选" : "全部下载"}
                </Button>
              </div>
            </div>
          )}
        </div>

      </header>

      <section className="mt-6 flex-1 pb-10">
        {!hasImages ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100">
              <ImageIcon className="h-12 w-12 text-zinc-300" />
            </div>
            <p className="text-base font-medium text-zinc-700">暂无媒体资源</p>
            <p className="mt-2 max-w-md text-sm text-zinc-500">
              在上方输入 Shopify 或其他店铺的页面 URL，点击「提取资源」即可列出页面中的图片与视频链接
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <MediaCard
                key={img.id}
                item={img}
                checked={selectedIdSet.has(img.id)}
                onToggle={toggleSelection}
                onError={handleImageError}
                onDownload={(item) => void handleDownloadSingle(item)}
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-zinc-700" />
              手动添加 URL
            </DialogTitle>
            <DialogDescription>
              支持输入单个或多个 URL。多个 URL 请使用换行、逗号或空格进行分隔。
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            rows={10}
            placeholder={"https://example.com/image1.jpg\nhttps://example.com/video1.mp4"}
            className="w-full resize-none rounded-lg border border-input bg-background p-4 font-mono text-sm shadow-xs transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/15"
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowUrlDialog(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleProcessUrls}>
              确认添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-indigo-600" />
              提取 JSON 图片
            </DialogTitle>
            <DialogDescription>
              粘贴模板 JSON，将自动提取 shopify://shop_images/ 格式的图片并生成下载链接。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                图片前缀 URL（可修改）
              </label>
              <Input
                type="text"
                value={jsonPrefixUrl}
                onChange={(event) => setJsonPrefixUrl(event.target.value)}
              />
            </div>

            <textarea
              value={jsonInput}
              onChange={(event) => setJsonInput(event.target.value)}
              rows={10}
              placeholder="在此粘贴 JSON 对象"
              className="w-full resize-none rounded-lg border border-input bg-background p-4 font-mono text-sm shadow-xs transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/15"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowJsonDialog(false)}>
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void handleProcessJson()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              提取并复制
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
