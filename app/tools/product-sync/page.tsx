import Link from "next/link";

import { ProductSyncToolClient } from "@/app/tools/product-sync/_components/product-sync-tool-client";
import { listAvailableSiteOptions } from "@/lib/config/sites";

export const metadata = {
  title: "跨店铺产品同步",
  description: "从源店铺读取产品并同步到目标店铺，自动避让已占用的 handle。",
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

      <ProductSyncToolClient siteOptions={siteOptions} />
    </main>
  );
}
