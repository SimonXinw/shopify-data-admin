"use client";

import "../file-sync-scroll.css";

import { memo, useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { CircleHelp } from "lucide-react";
import { toast } from "sonner";
import { CustomSelect } from "@/components/data-entry/custom-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SiteOption = {
  code: string;
  label: string;
  storeDomain: string;
};

type SiteImageItem = {
  id: string;
  alt: string;
  fileStatus: string;
  fileUrl: string;
  sizeBytes?: number;
  createdAt: string;
  updatedAt: string;
  fileName: string;
};

type ListApiResponse = {
  siteCode: string;
  first: number;
  count: number;
  items: SiteImageItem[];
  message?: string;
};

type SyncResultItem = {
  sourceFileId: string;
  sourceFileName: string;
  targetSiteCode: string;
  success: boolean;
  targetFileId?: string;
  targetFileStatus?: string;
  targetFileUrl?: string;
  message?: string;
};

type SyncApiResponse = {
  totalCount: number;
  successCount: number;
  failedCount: number;
  results: SyncResultItem[];
  message?: string;
};

type ActiveTab = "files" | "history";

type SuccessfulSyncHistoryItem = {
  id: string;
  sourceFileId: string;
  sourceFileName: string;
  sourceFileUrl: string;
  targetFileUrl: string;
  targetSiteCode: string;
  targetSiteLabel: string;
  targetFileStatus?: string;
  sizeBytes?: number;
  syncedAt: string;
};

const bytesToReadable = (value?: number): string => {
  if (!value || value < 1) {
    return "未知";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(2)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(2)} MB`;
};

const datetimeToReadable = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString("zh-CN", {
    hour12: false,
  });
};

const buildSyncSuccessToastMessage = (
  results: SyncResultItem[],
  siteOptions: SiteOption[],
): string | null => {
  const successfulResults = results.filter((result) => result.success);
  if (successfulResults.length < 1) {
    return null;
  }

  const syncedFileCount = new Set(successfulResults.map((result) => result.sourceFileId)).size;
  const syncedSiteLabels = Array.from(new Set(successfulResults.map((result) => result.targetSiteCode)))
    .map((code) => siteOptions.find((site) => site.code === code)?.label ?? code.toUpperCase())
    .join("、");

  return `已同步 ${syncedFileCount} 张图片到 ${syncedSiteLabels} 成功`;
};

const buildUrlMapping = (oldUrl: string, newUrl: string) => ({
  oldUrl,
  newUrl,
});

const buildSuccessfulSyncHistoryItems = (
  results: SyncResultItem[],
  sourceItems: SiteImageItem[],
  siteOptions: SiteOption[],
): SuccessfulSyncHistoryItem[] => {
  const sourceItemMap = new Map(sourceItems.map((item) => [item.id, item]));
  const siteOptionMap = new Map(siteOptions.map((site) => [site.code, site]));
  const syncedAt = new Date().toISOString();

  return results
    .filter((result) => result.success)
    .map((result) => {
      const sourceItem = sourceItemMap.get(result.sourceFileId);
      const sourceFileUrl = sourceItem?.fileUrl ?? "";
      const targetFileUrl = result.targetFileUrl ?? sourceFileUrl;
      const targetSiteLabel = siteOptionMap.get(result.targetSiteCode)?.label ?? result.targetSiteCode.toUpperCase();

      return {
        id: `${result.sourceFileId}-${result.targetSiteCode}-${result.targetFileId ?? syncedAt}`,
        sourceFileId: result.sourceFileId,
        sourceFileName: result.sourceFileName,
        sourceFileUrl,
        targetFileUrl,
        targetSiteCode: result.targetSiteCode,
        targetSiteLabel,
        targetFileStatus: result.targetFileStatus,
        sizeBytes: sourceItem?.sizeBytes,
        syncedAt,
      };
    });
};

type FileListRowProps = {
  item: SiteImageItem;
  checked: boolean;
  onToggle: (id: string) => void;
};

const FileListRow = memo(function FileListRow({ item, checked, onToggle }: FileListRowProps) {
  return (
    <div
      onClick={() => onToggle(item.id)}
      className={`group flex cursor-pointer items-stretch gap-3 rounded-xl border px-3.5 py-2.5 transition-[border-color,background-color,box-shadow] duration-150 hover:shadow-md ${
        checked ? "border-indigo-400 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-400/20" : "border-zinc-200 bg-white"
      }`}
    >
      <label className="flex shrink-0 cursor-pointer items-center" onClick={(event) => event.preventDefault()}>
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="pointer-events-none h-4 w-4 cursor-pointer rounded border-zinc-300 text-indigo-600 shadow-sm transition-colors focus:ring-indigo-500 focus:ring-offset-0"
        />
      </label>

      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-100 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element -- 外部 Shopify CDN，动态域名不适合 next/image 静态配置 */}
        <img src={item.fileUrl} alt={item.alt || item.fileName} className="h-full w-full object-cover" loading="lazy" />
      </div>

      <div className="min-w-0 flex-1 space-y-1 py-0.5">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium text-zinc-900" title={item.fileName}>
            {item.fileName}
          </div>
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
              item.fileStatus === "READY" ? "bg-emerald-100/80 text-emerald-800" : "bg-amber-100/80 text-amber-800"
            }`}
          >
            {item.fileStatus}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          <span>大小: {bytesToReadable(item.sizeBytes)}</span>
          <span>更新时间: {datetimeToReadable(item.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
});

export function FileSyncToolClient({ siteOptions }: { siteOptions: SiteOption[] }) {
  const FETCH_LIMIT = 250;
  const [sourceSiteCode, setSourceSiteCode] = useState(siteOptions[0]?.code ?? "");
  const [targetSiteCodes, setTargetSiteCodes] = useState<string[]>(() => {
    const src = siteOptions[0]?.code;
    const other = siteOptions.find((s) => s.code !== src);
    return other ? [other.code] : [];
  });
  const [items, setItems] = useState<SiteImageItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [onlyReady, setOnlyReady] = useState(true);
  const [nameKeyword, setNameKeyword] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("files");
  const [errorMessage, setErrorMessage] = useState("");
  const [syncSummary, setSyncSummary] = useState<SyncApiResponse | null>(null);
  const [syncHistoryItems, setSyncHistoryItems] = useState<SuccessfulSyncHistoryItem[]>([]);

  const selectableTargetSites = useMemo(
    () => siteOptions.filter((site) => site.code !== sourceSiteCode),
    [siteOptions, sourceSiteCode],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (onlyReady && item.fileStatus !== "READY") {
        return false;
      }

      if (nameKeyword.trim()) {
        const keyword = nameKeyword.trim().toLowerCase();
        const name = item.fileName.toLowerCase();
        const alt = item.alt.toLowerCase();
        if (!name.includes(keyword) && !alt.includes(keyword)) {
          return false;
        }
      }

      return true;
    });
  }, [items, onlyReady, nameKeyword]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const normalizedPage = Math.min(currentPage, totalPages);
  const pagedItems = useMemo(() => {
    const start = (normalizedPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, normalizedPage, pageSize]);

  const selectedCount = selectedIds.length;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelectedOnPage = pagedItems.length > 0 && pagedItems.every((item) => selectedIdSet.has(item.id));
  const syncHistoryCount = syncHistoryItems.length;

  const handleCopyText = async (value: string, successMessage: string) => {
    if (!value.trim()) {
      toast.error("没有可复制的内容。");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("复制失败，请检查浏览器剪贴板权限。");
    }
  };

  const handleCopyHistoryOldUrls = async () => {
    const text = syncHistoryItems.map((item) => item.sourceFileUrl).filter(Boolean).join("\n");
    await handleCopyText(text, `已复制 ${syncHistoryCount} 条旧 CDN 链接`);
  };

  const handleCopyHistoryNewUrls = async () => {
    const text = syncHistoryItems.map((item) => item.targetFileUrl).filter(Boolean).join("\n");
    await handleCopyText(text, `已复制 ${syncHistoryCount} 条新 CDN 链接`);
  };

  const handleCopyHistoryMappings = async () => {
    const mappings = syncHistoryItems.map((item) => buildUrlMapping(item.sourceFileUrl, item.targetFileUrl));
    await handleCopyText(JSON.stringify(mappings, null, 2), `已复制 ${syncHistoryCount} 条 URL 映射关系`);
  };

  const handleCopyHistoryNewUrl = async (item: SuccessfulSyncHistoryItem) => {
    await handleCopyText(item.targetFileUrl, "已复制新 CDN 链接");
  };

  const handleCopyHistoryMapping = async (item: SuccessfulSyncHistoryItem) => {
    await handleCopyText(JSON.stringify(buildUrlMapping(item.sourceFileUrl, item.targetFileUrl), null, 2), "已复制 URL 映射 JSON");
  };

  const loadFiles = async (siteCode: string) => {
    if (!siteCode) {
      setItems([]);
      setSelectedIds([]);
      return;
    }

    setIsLoadingFiles(true);
    setErrorMessage("");
    setSyncSummary(null);

    try {
      const response = await fetch("/api/tools/shopify/files/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteCode,
          first: FETCH_LIMIT,
        }),
      });

      const body = (await response.json()) as ListApiResponse;
      if (!response.ok) {
        setErrorMessage(body.message ?? "获取站点文件失败。");
        setItems([]);
        setSelectedIds([]);
        return;
      }

      setItems(body.items);
      setSelectedIds([]);
      setCurrentPage(1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "获取站点文件失败。");
      setItems([]);
      setSelectedIds([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    const code = siteOptions[0]?.code ?? "";
    if (!code) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时预拉取图片列表
    void loadFiles(code);
    // siteOptions 来自服务端 page，首屏稳定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = useCallback((tab: ActiveTab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  }, []);

  const toggleSingle = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const toggleAllOnPage = () => {
    if (allSelectedOnPage) {
      const pageIdSet = new Set(pagedItems.map((item) => item.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
      return;
    }

    const pageIds = pagedItems.map((item) => item.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const doSync = async (fileIds: string[]) => {
    if (!sourceSiteCode || targetSiteCodes.length < 1) {
      setErrorMessage("请选择源站点和至少一个目标站点。");
      return;
    }

    if (fileIds.length < 1) {
      setErrorMessage("请先至少选择一个文件。");
      return;
    }

    setIsSyncing(true);
    setErrorMessage("");
    setSyncSummary(null);

    try {
      const response = await fetch("/api/tools/shopify/files/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceSiteCode,
          targetSiteCodes,
          fileIds,
        }),
      });

      const body = (await response.json()) as SyncApiResponse;
      if (!response.ok) {
        setErrorMessage(body.message ?? "同步失败，请稍后重试。");
        return;
      }

      setSyncSummary(body);

      const successfulHistoryItems = buildSuccessfulSyncHistoryItems(body.results, items, siteOptions);
      if (successfulHistoryItems.length > 0) {
        setSyncHistoryItems((prev) => [...successfulHistoryItems, ...prev]);
        handleTabChange("history");
      }

      const successToastMessage = buildSyncSuccessToastMessage(body.results, siteOptions);
      if (successToastMessage) {
        toast.success(successToastMessage);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "同步失败，请稍后重试。");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSync = async () => {
    if (selectedIds.length < 1) {
      setErrorMessage("请先至少选择一个文件。");
      return;
    }

    if (targetSiteCodes.length < 1) {
      setErrorMessage("请先选择至少一个目标站点。");
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleRetryFailed = async () => {
    if (!syncSummary) {
      return;
    }

    const failedIds = Array.from(
      new Set(syncSummary.results.filter((result) => !result.success).map((result) => result.sourceFileId)),
    );
    if (failedIds.length < 1) {
      return;
    }

    await doSync(failedIds);
  };

  const handleConfirmSync = async () => {
    setIsConfirmOpen(false);
    await doSync(selectedIds);
  };

  const toggleTargetSiteCode = (siteCode: string) => {
    setTargetSiteCodes((prev) => {
      if (prev.includes(siteCode)) {
        return prev.filter((code) => code !== siteCode);
      }

      return [...prev, siteCode];
    });
  };

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col gap-4 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-center md:justify-start md:gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">跨站点图片同步</h1>
          <div className="group relative">
            <button
              type="button"
              aria-label="查看功能说明"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-zinc-600"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
            <div className="pointer-events-none absolute left-0 top-7 z-20 hidden w-[360px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed text-zinc-600 shadow-lg group-hover:block">
              <div className="absolute -top-1 left-2 h-2 w-2 rotate-45 border-l border-t border-zinc-200 bg-white" />
              从源站点读取 Shopify Files 图片列表，按需选择后批量同步到目标站点，并查看同步结果与目标 CDN。
            </div>
          </div>
        </div>

        <div className="relative grid min-w-[220px] shrink-0 grid-cols-2 items-center rounded-lg bg-zinc-300/80 p-1.5 shadow-[inset_0_3px_9px_rgba(0,0,0,0.22),inset_0_0_4px_rgba(0,0,0,0.14),inset_0_-1px_0_rgba(255,255,255,0.42),0_1px_0_rgba(255,255,255,0.85)]">
          <div
            className={`absolute bottom-1.5 left-1.5 top-1.5 w-[calc(50%-6px)] rounded-[6px] bg-[linear-gradient(180deg,#f1f1f3_0%,#e7e7ea_52%,#d8d9dd_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(0,0,0,0.16),0_0_0_1px_rgba(82,82,91,0.16),0_1px_1px_rgba(0,0,0,0.12)] will-change-transform transition-transform duration-300 ease-out ${
              activeTab === "files" ? "translate-x-0" : "translate-x-full"
            }`}
          />
          <button
            type="button"
            onClick={() => handleTabChange("files")}
            className={`relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-xs font-medium transition-colors duration-300 ${
              activeTab === "files" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            图片列表
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("history")}
            className={`relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-xs font-medium transition-colors duration-300 ${
              activeTab === "history" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            同步历史
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] transition-all duration-300 ${
                activeTab === "history"
                  ? "bg-zinc-200/80 text-zinc-800 shadow-[inset_0_1px_3px_rgba(0,0,0,0.15),0_1px_0_rgba(255,255,255,0.8)]"
                  : "bg-zinc-300/50 text-zinc-500"
              }`}
            >
              {syncHistoryCount}
            </span>
          </button>
        </div>
      </div>

      <div className="grid shrink-0 gap-2 rounded-xl border border-zinc-200/60 bg-zinc-50/50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end lg:grid-cols-[1fr_2fr_auto]">
        <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
          源站点
          <CustomSelect
            value={sourceSiteCode}
            options={siteOptions.map((site) => ({
              label: site.label,
              value: site.code,
              description: site.storeDomain,
            }))}
            onChange={(next) => {
              setSourceSiteCode(next);
              const others = siteOptions.filter((s) => s.code !== next);
              setTargetSiteCodes(others[0]?.code ? [others[0].code] : []);
              setCurrentPage(1);
              void loadFiles(next);
            }}
            className="h-11 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-sm shadow-sm outline-none transition-all hover:border-zinc-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            dropdownWidthClass="min-w-[200px]"
          />
        </label>

        <div className="grid gap-1 text-sm font-medium text-zinc-700">
          <span>目标站点（可多选）</span>
          <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50/50 px-2 py-1 shadow-sm transition-all">
            {selectableTargetSites.map((site) => (
              <button
                key={site.code}
                type="button"
                onClick={() => toggleTargetSiteCode(site.code)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                  targetSiteCodes.includes(site.code)
                    ? "bg-zinc-900 text-white shadow-sm ring-1 ring-zinc-900"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                {site.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadFiles(sourceSiteCode)}
          disabled={isLoadingFiles}
          className="h-11 cursor-pointer rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoadingFiles ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 animate-spin text-zinc-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              加载中…
            </span>
          ) : (
            "刷新源站点列表"
          )}
        </button>
      </div>

      <div className={activeTab === "files" ? "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pt-1" : "hidden"} aria-hidden={activeTab !== "files"}>
          {/* 控制台：筛选 + 统计 + 操作 合并到单行 */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-zinc-200/60 bg-zinc-50/50 px-2 py-1.5 shadow-sm">
            <input
              type="text"
              value={nameKeyword}
              onChange={(event) => {
                setNameKeyword(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="按文件名或 Alt 筛选"
              className="h-8 w-[180px] rounded-md border border-zinc-200 bg-white px-2.5 text-xs shadow-sm outline-none transition-colors hover:border-zinc-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700 shadow-sm transition-colors hover:border-zinc-300">
              <input
                type="checkbox"
                checked={onlyReady}
                onChange={(event) => {
                  setOnlyReady(event.target.checked);
                  setCurrentPage(1);
                }}
                className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-indigo-600 shadow-sm transition-colors focus:ring-indigo-500 focus:ring-offset-0"
              />
              仅 READY
            </label>

            <div className="flex items-center gap-2 px-1 text-[11px] text-zinc-500">
              <span>共 {items.length}</span>
              <span className="text-zinc-300">·</span>
              <span>筛选 <span className="font-medium text-zinc-700">{filteredItems.length}</span></span>
              <span className="text-zinc-300">·</span>
              <span>已选 <span className="font-medium text-indigo-600">{selectedCount}</span></span>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <label className="flex items-center gap-1 text-[11px] text-zinc-500">
                每页
                <CustomSelect
                  value={String(pageSize)}
                  options={[
                    { label: "50", value: "50" },
                    { label: "100", value: "100" },
                    { label: "200", value: "200" },
                  ]}
                  onChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                  className="h-7 cursor-pointer rounded-md border border-zinc-200 bg-white px-2 text-[11px] shadow-sm outline-none transition-colors hover:border-zinc-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </label>
              <span className="text-[11px] text-zinc-500">
                第 <span className="font-medium text-zinc-700">{normalizedPage}</span>/{totalPages}
              </span>

              <span className="mx-1 h-5 w-px bg-zinc-200" />

              <button
                type="button"
                onClick={toggleAllOnPage}
                disabled={pagedItems.length < 1}
                className="h-8 cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              >
                {allSelectedOnPage ? "取消全选" : "全选本页"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                disabled={selectedCount < 1}
                className="h-8 cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              >
                清空
              </button>
              <button
                type="button"
                onClick={handleRetryFailed}
                disabled={isSyncing || !syncSummary || syncSummary.failedCount < 1}
                className="h-8 cursor-pointer rounded-md border border-amber-200 bg-amber-50 px-2.5 text-xs font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-100 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              >
                重试失败
              </button>
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing || selectedCount < 1 || targetSiteCodes.length < 1}
                className="h-8 cursor-pointer rounded-md bg-indigo-600 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              >
                {isSyncing ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    同步中…
                  </span>
                ) : selectedCount > 0 ? (
                  `同步 (${selectedCount})`
                ) : (
                  "同步选中项"
                )}
              </button>
            </div>
          </div>

      {/* 列表：仅在容器内滚动 */}
      <div className="file_sync_scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-lg border border-zinc-200/50 bg-zinc-50/30 p-1.5">
        {filteredItems.length < 1 && !isLoadingFiles ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            当前筛选条件下没有可展示的图片文件，或账号缺少 `read_files` 权限。
          </div>
        ) : (
          pagedItems.map((item) => (
            <FileListRow key={item.id} item={item} checked={selectedIdSet.has(item.id)} onToggle={toggleSingle} />
          ))
        )}
      </div>

        {filteredItems.length > 0 ? (
          <div className="flex shrink-0 items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={normalizedPage <= 1}
              className="h-7 cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            >
              上一页
            </button>
            <span className="self-center text-xs text-zinc-600">
              第 {normalizedPage} / {totalPages} 页
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={normalizedPage >= totalPages}
              className="h-7 cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        ) : null}
      </div>

      <div className={activeTab === "history" ? "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pt-1" : "hidden"} aria-hidden={activeTab !== "history"}>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200/60 bg-zinc-50/50 px-2 py-1.5 shadow-sm">
            <div className="px-1 text-xs font-medium text-zinc-700">
              成功记录 <span className="text-indigo-600">{syncHistoryCount}</span> 条
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopyHistoryOldUrls()}
                disabled={syncHistoryCount < 1}
                className="h-9 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              >
                批量复制旧 CDN
              </button>
              <button
                type="button"
                onClick={() => void handleCopyHistoryNewUrls()}
                disabled={syncHistoryCount < 1}
                className="h-9 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              >
                批量复制新 CDN
              </button>
              <button
                type="button"
                onClick={() => void handleCopyHistoryMappings()}
                disabled={syncHistoryCount < 1}
                className="h-9 cursor-pointer rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              >
                批量复制 JSON 映射
              </button>
            </div>
          </div>

          {syncHistoryCount < 1 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
              暂无成功同步记录。同步成功后，这里会显示图片、旧 CDN、新 CDN 和大小。
            </div>
          ) : (
            <div className="file_sync_scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-zinc-200/50 bg-zinc-50/30 p-1.5">
              {syncHistoryItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-150 hover:shadow-md lg:flex-row lg:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 shadow-sm">
                      {item.sourceFileUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- 外部 Shopify CDN，动态域名不适合 next/image 静态配置 */}
                          <img src={item.sourceFileUrl} alt={item.sourceFileName} className="h-full w-full object-cover" loading="lazy" />
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">无预览</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-medium text-zinc-900" title={item.sourceFileName}>
                          {item.sourceFileName}
                        </div>
                        <span className="rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                          {item.targetSiteLabel}
                        </span>
                        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                          {bytesToReadable(item.sizeBytes)}
                        </span>
                      </div>

                      <div className="grid gap-1 text-[11px] text-zinc-500">
                        <div className="min-w-0 truncate">
                          旧 URL:{" "}
                          {item.sourceFileUrl ? (
                            <a
                              href={item.sourceFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cursor-pointer text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-900"
                              title={item.sourceFileUrl}
                            >
                              {item.sourceFileUrl}
                            </a>
                          ) : (
                            "未知"
                          )}
                        </div>
                        <div className="min-w-0 truncate">
                          新 URL:{" "}
                          {item.targetFileUrl ? (
                            <a
                              href={item.targetFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cursor-pointer text-indigo-600 underline decoration-indigo-300 underline-offset-2 transition-colors hover:text-indigo-800"
                              title={item.targetFileUrl}
                            >
                              {item.targetFileUrl}
                            </a>
                          ) : (
                            "未知"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => void handleCopyHistoryNewUrl(item)}
                      disabled={!item.targetFileUrl}
                      className="h-8 cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                    >
                      复制新 CDN
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyHistoryMapping(item)}
                      disabled={!item.sourceFileUrl && !item.targetFileUrl}
                      className="h-8 cursor-pointer rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                    >
                      复制映射 JSON
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {errorMessage ? (
        <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 shadow-sm">{errorMessage}</div>
      ) : null}

      {syncSummary ? (
        <div className="shrink-0 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 shadow-sm">
          <div className="text-[11px] font-medium text-zinc-700">
            结果：共 {syncSummary.totalCount} 条 · 成功 <span className="text-emerald-600">{syncSummary.successCount}</span> · 失败 <span className="text-amber-600">{syncSummary.failedCount}</span>
          </div>

          <div className="file_sync_scroll grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {syncSummary.results.map((result) => (
              <div
                key={`${result.sourceFileId}-${result.targetSiteCode}`}
                className={`rounded-lg border px-2.5 py-2 text-[11px] leading-snug transition-all ${
                  result.success
                    ? "border-emerald-200/80 bg-emerald-50/50 text-emerald-900"
                    : "border-amber-200/80 bg-amber-50/50 text-amber-900"
                }`}
              >
                <div className="font-medium">{result.sourceFileName}</div>
                <div className="mt-0.5 text-zinc-600">
                  → <span className="font-medium">{result.targetSiteCode.toUpperCase()}</span>
                  <span className="ml-1.5 text-zinc-500">
                    状态: {result.targetFileStatus ?? (result.success ? "PROCESSING" : "FAILED")}
                  </span>
                </div>
                {result.targetFileId ? <div className="mt-0.5 text-zinc-500">ID: {result.targetFileId}</div> : null}
                {result.targetFileUrl ? (
                  <div className="mt-1 truncate">
                    CDN:{" "}
                    <a
                      href={result.targetFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer text-indigo-600 underline decoration-indigo-300 underline-offset-2 transition-colors hover:text-indigo-800"
                    >
                      {result.targetFileUrl}
                    </a>
                  </div>
                ) : null}
                {result.message ? <div className="mt-1 text-zinc-600">{result.message}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认同步</DialogTitle>
            <DialogDescription>
              将同步 <b className="text-foreground">{selectedCount}</b> 个文件到{" "}
              <b className="text-foreground">{targetSiteCodes.length}</b> 个目标站。
              <span className="mt-1 block text-[11px] text-muted-foreground">该操作会在目标站点创建新文件记录。</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              className="h-8 cursor-pointer rounded-md border border-border bg-background px-3.5 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted active:scale-95"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmSync()}
              className="h-8 cursor-pointer rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
            >
              确认同步
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
