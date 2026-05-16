import Link from "next/link";

import { ProductSyncToolClient } from "@/app/tools/product-sync/_components/product-sync-tool-client";
import { listAvailableSiteOptions } from "@/lib/config/sites";

export const metadata = {
  title: "跨站点产品同步",
  description: "从源站点读取产品并同步到目标站点，自动避让已占用的 handle。",
};

export default function ProductSyncToolPage() {
  const siteOptions = listAvailableSiteOptions();

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-5 md:px-6">
      <div className="mx-auto mb-3 flex w-full max-w-[1100px] flex-wrap items-center gap-2">
        <Link
          href="/"
          className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 active:scale-95"
        >
          返回首页
        </Link>
        <Link
          href="/tools/file-sync"
          className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 active:scale-95"
        >
          图片同步
        </Link>
        <Link
          href="/tools/image-upload"
          className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 active:scale-95"
        >
          图片上传
        </Link>
      </div>

      {siteOptions.length > 1 ? (
        <ProductSyncToolClient siteOptions={siteOptions} />
      ) : (
        <div className="mx-auto w-full max-w-xl rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          跨站点产品同步至少需要两个已配置站点。请先在 `.env.local` 中配置至少两组
          `*_SHOPIFY_STORE_DOMAIN` 与 `*_SHOPIFY_ADMIN_ACCESS_TOKEN`（需含
          <code className="rounded bg-amber-100 px-1">read_products</code> 与{" "}
          <code className="rounded bg-amber-100 px-1">write_products</code> 权限）。
        </div>
      )}
    </main>
  );
}
