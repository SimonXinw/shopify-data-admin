"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [errorMessage, setErrorMessage] = useState("");
  const [syncSummary, setSyncSummary] = useState<SyncApiResponse | null>(null);

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

  const toggleSingle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

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
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all duration-300">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">跨站点图片同步</h1>
        <p className="text-sm leading-relaxed text-zinc-500">
          从源站点读取 Shopify Files 图片列表，按需选择后批量同步到目标站点，并查看同步结果与目标 CDN。
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end lg:grid-cols-[1fr_2fr_auto]">
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
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

      {/* 筛选：列表内 */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 shadow-sm transition-all">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm transition-all hover:border-zinc-300">
          <input
            type="checkbox"
            checked={onlyReady}
            onChange={(event) => {
              setOnlyReady(event.target.checked);
              setCurrentPage(1);
            }}
            className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-indigo-600 shadow-sm transition-colors focus:ring-indigo-500 focus:ring-offset-0"
          />
          仅显示 READY 文件
        </label>

        <div className="flex min-w-[200px] flex-1 items-center gap-1">
          <input
            type="text"
            value={nameKeyword}
            onChange={(event) => {
              setNameKeyword(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="按文件名或 Alt 筛选"
            className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm shadow-sm outline-none transition-all hover:border-zinc-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm transition-all hover:border-zinc-300">
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
            className="h-8 cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 text-xs shadow-sm outline-none transition-all hover:border-zinc-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <span className="text-xs text-zinc-500">（Shopify 拉取上限 250）</span>
        </label>
      </div>

      {/* 工具条 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 pt-1">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
          <span>共 {items.length} 项</span>
          <span>筛选后 <span className="font-medium text-zinc-700">{filteredItems.length}</span></span>
          <span>已选 <span className="font-medium text-zinc-700">{selectedCount}</span></span>
          <span>
            第 <span className="font-medium text-zinc-700">{normalizedPage}</span>/{totalPages} 页
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAllOnPage}
            disabled={pagedItems.length < 1}
            className="h-9 cursor-pointer rounded-lg border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            {allSelectedOnPage ? "取消当前页全选" : "全选当前页"}
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            disabled={selectedCount < 1}
            className="h-9 cursor-pointer rounded-lg border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            清空选择
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing || selectedCount < 1 || targetSiteCodes.length < 1}
            className="h-9 cursor-pointer rounded-lg bg-zinc-900 px-5 text-xs font-medium text-white shadow-sm transition-all hover:bg-zinc-800 hover:shadow active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            {isSyncing ? (
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在同步…
              </span>
            ) : selectedCount > 1 ? (
              `批量同步 (${selectedCount})`
            ) : selectedCount === 1 ? (
              "同步选中项"
            ) : (
              "请选择后同步"
            )}
          </button>

          <button
            type="button"
            onClick={handleRetryFailed}
            disabled={isSyncing || !syncSummary || syncSummary.failedCount < 1}
            className="h-9 cursor-pointer rounded-lg border border-amber-200 bg-amber-50 px-4 text-xs font-medium text-amber-800 shadow-sm transition-all hover:bg-amber-100 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            重试失败项
          </button>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex flex-col gap-1.5">
        {pagedItems.map((item) => {
          const checked = selectedIdSet.has(item.id);
          return (
            <div
              key={item.id}
              onClick={() => toggleSingle(item.id)}
              className={`group flex cursor-pointer items-stretch gap-4 rounded-xl border px-4 py-3 transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-md ${
                checked ? "border-indigo-400 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-400/20" : "border-zinc-200 bg-white"
              }`}
            >
              <label className="flex shrink-0 cursor-pointer items-center" onClick={(e) => e.preventDefault()}>
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="pointer-events-none h-4 w-4 cursor-pointer rounded border-zinc-300 text-indigo-600 shadow-sm transition-colors focus:ring-indigo-500 focus:ring-offset-0"
                />
              </label>

              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-100 shadow-sm transition-transform group-hover:scale-105">
                {/* eslint-disable-next-line @next/next/no-img-element -- 外部 Shopify CDN，动态域名不适合 next/image 静态配置 */}
                <img src={item.fileUrl} alt={item.alt || item.fileName} className="h-full w-full object-cover transition-opacity duration-300" loading="lazy" />
              </div>

              <div className="min-w-0 flex-1 space-y-1 py-0.5">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-medium text-zinc-900" title={item.fileName}>
                    {item.fileName}
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      item.fileStatus === "READY"
                        ? "bg-emerald-100/80 text-emerald-800"
                        : "bg-amber-100/80 text-amber-800"
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
        })}
      </div>

        {filteredItems.length < 1 && !isLoadingFiles ? (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            当前筛选条件下没有可展示的图片文件，或账号缺少 `read_files` 权限。
          </div>
        ) : null}

        {filteredItems.length > 0 ? (
          <div className="mt-4 flex items-center justify-end gap-2">
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

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 shadow-sm">{errorMessage}</div>
      ) : null}

      {syncSummary ? (
        <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 shadow-sm transition-all">
          <div className="text-[11px] font-medium text-zinc-700">
            结果：共 {syncSummary.totalCount} 条 · 成功 <span className="text-emerald-600">{syncSummary.successCount}</span> · 失败 <span className="text-amber-600">{syncSummary.failedCount}</span>
          </div>

          <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
