"use client";

import { useEffect, useMemo, useState } from "react";

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

export function FileSyncToolClient({ siteOptions }: { siteOptions: SiteOption[] }) {
  const FETCH_LIMIT = 250;
  const [sourceSiteCode, setSourceSiteCode] = useState(siteOptions[0]?.code ?? "");
  const [targetSiteCodes, setTargetSiteCodes] = useState<string[]>([]);
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

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIdSet.has(item.id));
  }, [items, selectedIdSet]);

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
    const defaultTargetCode = selectableTargetSites[0]?.code;
    setTargetSiteCodes(defaultTargetCode ? [defaultTargetCode] : []);
  }, [sourceSiteCode, selectableTargetSites]);

  useEffect(() => {
    setCurrentPage(1);
  }, [onlyReady, nameKeyword, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    void loadFiles(sourceSiteCode);
  }, [sourceSiteCode]);

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
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">跨站点图片同步</h1>
        <p className="text-sm text-zinc-600">
          从源站点读取 Shopify Files 图片列表，按需选择后批量同步到目标站点，并查看同步结果与目标 CDN。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-2 text-sm font-medium text-zinc-800">
          源站点
          <select
            value={sourceSiteCode}
            onChange={(event) => setSourceSiteCode(event.target.value)}
            className="h-11 cursor-pointer rounded-lg border border-zinc-300 px-3 outline-none ring-indigo-500 focus:ring-2"
          >
            {siteOptions.map((site) => (
              <option key={site.code} value={site.code}>
                {site.label} ({site.storeDomain})
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2 text-sm font-medium text-zinc-800">
          <span>目标站点（可多选）</span>
          <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2">
            {selectableTargetSites.map((site) => (
              <button
                key={site.code}
                type="button"
                onClick={() => toggleTargetSiteCode(site.code)}
                className={`cursor-pointer rounded-md border px-2 py-1 text-xs transition ${
                  targetSiteCodes.includes(site.code)
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {site.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void loadFiles(sourceSiteCode)}
            disabled={isLoadingFiles}
            className="h-11 cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            {isLoadingFiles ? "正在拉取列表..." : "刷新源站点列表"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={onlyReady}
              onChange={(event) => setOnlyReady(event.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            仅显示 READY 文件
          </label>

          <input
            type="text"
            value={nameKeyword}
            onChange={(event) => setNameKeyword(event.target.value)}
            placeholder="按文件名或 Alt 筛选"
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none ring-indigo-500 focus:ring-2 md:col-span-2"
          />

          <label className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
            每页
            <select
              value={String(pageSize)}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="h-8 cursor-pointer rounded border border-zinc-300 bg-white px-2 text-xs outline-none ring-indigo-500 focus:ring-2"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
            <span className="text-xs text-zinc-500">（Shopify 单次拉取上限 250）</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-zinc-700">
            <span>共 {items.length} 项</span>
            <span>筛选后 {filteredItems.length} 项</span>
            <span>已选 {selectedCount} 项</span>
            <span>
              第 {normalizedPage}/{totalPages} 页
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleAllOnPage}
              disabled={pagedItems.length < 1}
              className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              {allSelectedOnPage ? "取消当前页全选" : "全选当前页"}
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={selectedCount < 1}
              className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              清空选择
            </button>

            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing || selectedCount < 1 || targetSiteCodes.length < 1}
              className="h-9 cursor-pointer rounded-md bg-zinc-900 px-4 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isSyncing
                ? "正在同步..."
                : selectedCount > 1
                  ? `批量同步 (${selectedCount})`
                  : selectedCount === 1
                    ? "同步选中项"
                    : "请选择后同步"}
            </button>

            <button
              type="button"
              onClick={handleRetryFailed}
              disabled={isSyncing || !syncSummary || syncSummary.failedCount < 1}
              className="h-9 cursor-pointer rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              重试失败项
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {pagedItems.map((item) => {
            const checked = selectedIdSet.has(item.id);
            return (
              <label
                key={item.id}
                className={`group flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-3 transition ${
                  checked ? "border-indigo-300 ring-2 ring-indigo-100" : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2 self-start">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSingle(item.id)}
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                <div className="overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                  <img src={item.fileUrl} alt={item.alt || item.fileName} className="h-16 w-16 object-cover" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-medium text-zinc-900" title={item.fileName}>
                      {item.fileName}
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        item.fileStatus === "READY"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.fileStatus}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span>大小: {bytesToReadable(item.sizeBytes)}</span>
                    <span>更新时间: {datetimeToReadable(item.updatedAt)}</span>
                  </div>
                </div>
              </label>
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
              className="h-8 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              上一页
            </button>
            <span className="text-xs text-zinc-600">
              第 {normalizedPage} / {totalPages} 页
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={normalizedPage >= totalPages}
              className="h-8 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              下一页
            </button>
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
      ) : null}

      {syncSummary ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            共 {syncSummary.totalCount} 个文件，成功 {syncSummary.successCount}，失败 {syncSummary.failedCount}。
          </div>

          <div className="grid gap-3">
            {syncSummary.results.map((result) => (
              <div
                key={`${result.sourceFileId}-${result.targetSiteCode}`}
                className={`rounded-lg border p-3 text-sm ${
                  result.success
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                <div className="font-medium">{result.sourceFileName}</div>
                <div>目标站点: {result.targetSiteCode.toUpperCase()}</div>
                <div>状态: {result.targetFileStatus ?? (result.success ? "PROCESSING" : "FAILED")}</div>
                {result.targetFileId ? <div>目标文件 ID: {result.targetFileId}</div> : null}
                {result.targetFileUrl ? (
                  <div className="truncate">
                    CDN:{" "}
                    <a
                      href={result.targetFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer underline decoration-dotted"
                    >
                      {result.targetFileUrl}
                    </a>
                  </div>
                ) : null}
                {result.message ? <div>说明: {result.message}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="text-lg font-semibold text-zinc-900">确认同步</div>
            <div className="mt-3 space-y-1 text-sm text-zinc-600">
              <div>将同步 {selectedCount} 个文件</div>
              <div>目标站点 {targetSiteCodes.length} 个</div>
              <div className="text-xs text-zinc-500">该操作会在目标站点创建新文件记录。</div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmSync()}
                className="h-9 cursor-pointer rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-700"
              >
                确认同步
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
