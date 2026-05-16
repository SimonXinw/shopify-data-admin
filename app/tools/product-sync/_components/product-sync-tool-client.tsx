"use client";

import { useEffect, useMemo, useState } from "react";
import { CustomSelect } from "@/components/data-entry/custom-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { SHOPIFY_PRODUCT_LIST_LIMIT, SHOPIFY_PRODUCT_SYNC_BATCH } from "@/lib/constants/shopify";

type SiteOption = {
  code: string;
  label: string;
  storeDomain: string;
};

type SiteProductListItem = {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  updatedAt: string;
  tags: string[];
  imageUrl: string;
  imageAlt: string;
  variantCount: number;
  hasMultipleVariants: boolean;
};

type ListApiResponse = {
  siteCode: string;
  first: number;
  count: number;
  items: SiteProductListItem[];
  message?: string;
};

type SyncResultItem = {
  sourceProductId: string;
  sourceTitle: string;
  sourceHandle: string;
  targetSiteCode: string;
  success: boolean;
  targetProductId?: string;
  targetHandle?: string;
  message?: string;
};

type SyncApiResponse = {
  totalCount: number;
  successCount: number;
  failedCount: number;
  results: SyncResultItem[];
  message?: string;
};

function gidToAdminProductPath(gid: string): string {
  const id = gid.split("/").pop() ?? gid;
  return `/admin/products/${id}`;
}

function datetimeShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString("zh-CN", { hour12: false, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function ProductSyncToolClient({ siteOptions }: { siteOptions: SiteOption[] }) {
  const [sourceSiteCode, setSourceSiteCode] = useState(siteOptions[0]?.code ?? "");
  const [targetSiteCodes, setTargetSiteCodes] = useState<string[]>(() => {
    const src = siteOptions[0]?.code;
    const other = siteOptions.find((s) => s.code !== src);
    return other ? [other.code] : [];
  });
  const [items, setItems] = useState<SiteProductListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [shopifyQueryDraft, setShopifyQueryDraft] = useState("");
  const [shopifyQueryApplied, setShopifyQueryApplied] = useState("");
  const [pageSize, setPageSize] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [syncSummary, setSyncSummary] = useState<SyncApiResponse | null>(null);

  const selectableTargetSites = useMemo(
    () => siteOptions.filter((site) => site.code !== sourceSiteCode),
    [siteOptions, sourceSiteCode],
  );

  const sourceStoreDomain = siteOptions.find((s) => s.code === sourceSiteCode)?.storeDomain ?? "";

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter && item.status !== statusFilter) {
        return false;
      }

      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase();
        const blob = [item.title, item.handle, item.vendor, item.tags.join(" ")].join("\n").toLowerCase();
        if (!blob.includes(k)) {
          return false;
        }
      }

      return true;
    });
  }, [items, statusFilter, keyword]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const normalizedPage = Math.min(currentPage, totalPages);
  const pagedItems = useMemo(() => {
    const start = (normalizedPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, normalizedPage, pageSize]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;
  const allSelectedOnPage = pagedItems.length > 0 && pagedItems.every((item) => selectedIdSet.has(item.id));

  const loadProducts = async (siteCode: string, shopifyQuery?: string) => {
    if (!siteCode) {
      setItems([]);
      setSelectedIds([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSyncSummary(null);

    try {
      const response = await fetch("/api/tools/shopify/products/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteCode,
          first: SHOPIFY_PRODUCT_LIST_LIMIT,
          query: shopifyQuery?.trim() || undefined,
        }),
      });

      const body = (await response.json()) as ListApiResponse;
      if (!response.ok) {
        setErrorMessage(body.message ?? "获取产品列表失败。");
        setItems([]);
        setSelectedIds([]);
        return;
      }

      setItems(body.items);
      setSelectedIds([]);
      setCurrentPage(1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "获取产品列表失败。");
      setItems([]);
      setSelectedIds([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyServerSearch = () => {
    const q = shopifyQueryDraft.trim();
    setShopifyQueryApplied(q);
    setCurrentPage(1);
    void loadProducts(sourceSiteCode, q || undefined);
  };

  useEffect(() => {
    const code = siteOptions[0]?.code ?? "";
    if (!code) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时预拉取产品列表
    void loadProducts(code, undefined);
    // siteOptions 来自服务端 page，首屏稳定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSingle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAllOnPage = () => {
    if (allSelectedOnPage) {
      const pageSet = new Set(pagedItems.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !pageSet.has(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...pagedItems.map((i) => i.id)])));
  };

  const selectOnly = (id: string) => {
    setSelectedIds([id]);
  };

  const doSync = async (productIds: string[]) => {
    if (!sourceSiteCode || targetSiteCodes.length < 1) {
      setErrorMessage("请选择源站点和至少一个目标站点。");
      return;
    }

    if (productIds.length < 1) {
      setErrorMessage("请至少选择一个产品。");
      return;
    }

    setIsSyncing(true);
    setErrorMessage("");
    setSyncSummary(null);

    try {
      const response = await fetch("/api/tools/shopify/products/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceSiteCode,
          targetSiteCodes,
          productIds,
        }),
      });

      const body = (await response.json()) as SyncApiResponse;
      if (!response.ok) {
        setErrorMessage(body.message ?? "同步失败。");
        return;
      }

      setSyncSummary(body);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "同步失败。");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncClick = () => {
    if (selectedIds.length < 1) {
      setErrorMessage("请先选择产品。");
      return;
    }

    if (targetSiteCodes.length < 1) {
      setErrorMessage("请选择至少一个目标站点。");
      return;
    }

    if (selectedIds.length > SHOPIFY_PRODUCT_SYNC_BATCH) {
      setErrorMessage(`单次最多同步 ${SHOPIFY_PRODUCT_SYNC_BATCH} 个产品，请减少选择或分批操作。`);
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSync = async () => {
    setIsConfirmOpen(false);
    await doSync(selectedIds);
  };

  const handleRetryFailed = async () => {
    if (!syncSummary) {
      return;
    }

    const failedIds = Array.from(
      new Set(syncSummary.results.filter((r) => !r.success).map((r) => r.sourceProductId)),
    );
    if (failedIds.length < 1) {
      return;
    }

    await doSync(failedIds);
  };

  const toggleTargetSiteCode = (siteCode: string) => {
    setTargetSiteCodes((prev) =>
      prev.includes(siteCode) ? prev.filter((c) => c !== siteCode) : [...prev, siteCode],
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-300">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">跨站点产品同步</h1>
        <p className="text-xs leading-relaxed text-zinc-500">
          拉取源站产品列表，多选后同步到目标站；目标站若已占用 handle 会自动改为{" "}
          <code className="rounded-md border border-zinc-200/80 bg-zinc-100/50 px-1 py-0.5 font-mono text-zinc-600">-copy</code> /{" "}
          <code className="rounded-md border border-zinc-200/80 bg-zinc-100/50 px-1 py-0.5 font-mono text-zinc-600">-copy-2</code>… 同步含标题、描述、厂商、类型、标签、SEO、图片、变体价格/SKU
          及元字段（目标站需有对应 metafield 定义时才能写入）。不包含库存数量与各销售渠道上架状态。
        </p>
      </div>

      {/* 筛选：站点 */}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-1 text-xs font-medium text-zinc-700">
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
              setShopifyQueryDraft("");
              setShopifyQueryApplied("");
              const others = siteOptions.filter((s) => s.code !== next);
              setTargetSiteCodes(others[0]?.code ? [others[0].code] : []);
              setCurrentPage(1);
              void loadProducts(next, undefined);
            }}
            className="h-8 cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 text-xs shadow-sm outline-none transition-all hover:border-zinc-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            dropdownWidthClass="min-w-[200px]"
          />
        </label>

        <div className="grid gap-1 text-xs font-medium text-zinc-700">
          <span>目标站点</span>
          <div className="flex min-h-8 flex-wrap gap-1 rounded-md border border-zinc-200 bg-zinc-50/50 px-2 py-1 shadow-sm transition-all">
            {selectableTargetSites.map((site) => (
              <button
                key={site.code}
                type="button"
                onClick={() => toggleTargetSiteCode(site.code)}
                className={`cursor-pointer rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-all active:scale-95 ${
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
          onClick={() => void loadProducts(sourceSiteCode, shopifyQueryApplied.trim() || undefined)}
          disabled={isLoading}
          className="h-8 cursor-pointer rounded-md border border-zinc-200 bg-white px-3.5 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 animate-spin text-zinc-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              加载中…
            </span>
          ) : (
            "刷新列表"
          )}
        </button>
      </div>

      {/* 筛选：列表内 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-2.5 shadow-sm transition-all">
        <label className="flex items-center gap-1 text-[11px] text-zinc-600">
          状态
          <CustomSelect
            value={statusFilter}
            options={[
              { label: "全部", value: "" },
              { label: "ACTIVE", value: "ACTIVE" },
              { label: "DRAFT", value: "DRAFT" },
              { label: "ARCHIVED", value: "ARCHIVED" },
            ]}
            onChange={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
            className="h-7 cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] shadow-sm outline-none transition-all hover:border-zinc-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </label>

        <div className="flex min-w-[200px] flex-1 items-center gap-1">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="标题 / handle / 厂商 / 标签（本地筛）"
            className="h-7 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] shadow-sm outline-none transition-all hover:border-zinc-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <input
          type="text"
          value={shopifyQueryDraft}
          onChange={(e) => setShopifyQueryDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              applyServerSearch();
            }
          }}
          placeholder="Shopify 搜索（回车应用）"
          className="h-7 w-full min-w-[160px] max-w-[240px] rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] shadow-sm outline-none transition-all hover:border-zinc-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:w-56"
          title="例如 title:卫衣 或 vendor:Acme；回车后重新拉取列表"
        />
        <button
          type="button"
          onClick={applyServerSearch}
          className="h-7 shrink-0 rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95"
        >
          应用搜索
        </button>

        <label className="flex items-center gap-1 text-[11px] text-zinc-600">
          每页
          <CustomSelect
            value={String(pageSize)}
            options={[
              { label: "20", value: "20" },
              { label: "30", value: "30" },
              { label: "50", value: "50" },
            ]}
            onChange={(val) => {
              setPageSize(Number(val));
              setCurrentPage(1);
            }}
            className="h-7 cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] shadow-sm outline-none transition-all hover:border-zinc-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </label>

        <span className="text-[11px] text-zinc-400">上限 {SHOPIFY_PRODUCT_LIST_LIMIT}</span>
      </div>

      {/* 工具条 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 pt-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          <span>共 {items.length} 条</span>
          <span>筛后 <span className="font-medium text-zinc-700">{filteredItems.length}</span></span>
          <span>已选 <span className="font-medium text-zinc-700">{selectedCount}</span></span>
          <span>
            页 <span className="font-medium text-zinc-700">{normalizedPage}</span>/{totalPages}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={toggleAllOnPage}
            disabled={pagedItems.length < 1}
            className="h-7 cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            {allSelectedOnPage ? "页内全不选" : "页内全选"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            disabled={selectedCount < 1}
            className="h-7 cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            清空
          </button>
          <button
            type="button"
            onClick={handleSyncClick}
            disabled={isSyncing || selectedCount < 1 || targetSiteCodes.length < 1}
            className="h-7 cursor-pointer rounded-md bg-zinc-900 px-3.5 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-zinc-800 hover:shadow active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            {isSyncing ? (
              <span className="flex items-center gap-1.5">
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                同步中…
              </span>
            ) : (
              `同步 (${selectedCount})`
            )}
          </button>
          <button
            type="button"
            onClick={handleRetryFailed}
            disabled={isSyncing || !syncSummary || syncSummary.failedCount < 1}
            className="h-7 cursor-pointer rounded-md border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-medium text-amber-800 shadow-sm transition-all hover:bg-amber-100 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            重试失败
          </button>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex flex-col gap-1.5">
        {pagedItems.map((item) => {
          const checked = selectedIdSet.has(item.id);
          const adminHref =
            sourceStoreDomain && item.id ? `https://${sourceStoreDomain}${gidToAdminProductPath(item.id)}` : "";

          return (
            <div
              key={item.id}
              onClick={() => toggleSingle(item.id)}
              className={`group flex cursor-pointer items-stretch gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-md ${
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

              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-100 shadow-sm transition-transform group-hover:scale-105">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 外部 Shopify CDN，动态域名不适合 next/image 静态配置
                  <img src={item.imageUrl} alt={item.imageAlt} className="h-full w-full object-cover transition-opacity duration-300" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">无图</div>
                )}
              </div>

              <div className="min-w-0 flex-1 py-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="truncate text-sm font-medium text-zinc-900" title={item.title}>
                    {item.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      item.status === "ACTIVE"
                        ? "bg-emerald-100/80 text-emerald-800"
                        : item.status === "DRAFT"
                          ? "bg-zinc-200/80 text-zinc-700"
                          : "bg-zinc-300/80 text-zinc-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
                  <span className="font-mono text-zinc-600" title={item.handle}>
                    /{item.handle}
                  </span>
                  {item.vendor ? <span className="rounded bg-zinc-100 px-1 py-0.5">{item.vendor}</span> : null}
                  <span>
                    {item.variantCount} 变体{item.hasMultipleVariants ? "+" : ""}
                  </span>
                  <span className="text-zinc-400">{datetimeShort(item.updatedAt)}</span>
                </div>
                {item.tags.length > 0 ? (
                  <div className="mt-1 truncate text-[10px] text-zinc-400" title={item.tags.join(", ")}>
                    {item.tags.slice(0, 6).join(" · ")}
                    {item.tags.length > 6 ? "…" : ""}
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col items-end justify-center gap-1 border-l border-zinc-100 pl-3">
                {adminHref ? (
                  <a
                    href={adminHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    后台
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectOnly(item.id);
                  }}
                  className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  仅选
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length < 1 && !isLoading ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 py-10 text-center text-xs text-zinc-500 shadow-sm">
          无数据。请检查 Admin Token 是否包含 <code className="rounded bg-zinc-200 px-1 py-0.5">read_products</code>，或调整筛选 / Shopify
          搜索条件。
        </div>
      ) : null}

      {filteredItems.length > 0 ? (
        <div className="flex justify-end gap-1.5 pt-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={normalizedPage <= 1}
            className="h-7 cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            上一页
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {syncSummary.results.map((r) => (
              <div
                key={`${r.sourceProductId}-${r.targetSiteCode}`}
                className={`rounded-lg border px-2.5 py-2 text-[11px] leading-snug transition-all ${
                  r.success ? "border-emerald-200/80 bg-emerald-50/50 text-emerald-900" : "border-amber-200/80 bg-amber-50/50 text-amber-900"
                }`}
              >
                <div className="font-medium">{r.sourceTitle}</div>
                <div className="mt-0.5 text-zinc-600">
                  → <span className="font-medium">{r.targetSiteCode.toUpperCase()}</span>
                  {r.targetHandle ? (
                    <span className="ml-1.5 font-mono text-[10px] text-zinc-500">
                      {r.sourceHandle && r.sourceHandle !== r.targetHandle
                        ? `handle ${r.sourceHandle} → ${r.targetHandle}`
                        : `handle ${r.targetHandle}`}
                    </span>
                  ) : null}
                </div>
                {r.message ? <div className="mt-1 text-zinc-600">{r.message}</div> : null}
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
              将 <b className="text-foreground">{selectedCount}</b> 个产品同步到{" "}
              <b className="text-foreground">{targetSiteCodes.length}</b> 个目标站（最多{" "}
              {SHOPIFY_PRODUCT_SYNC_BATCH} 个 / 次）。目标站会新建产品；handle 冲突会自动追加{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">-copy</code> 等后缀。
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
              确认
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
