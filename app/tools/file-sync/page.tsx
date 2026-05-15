import Link from "next/link";

import { listAvailableSiteOptions } from "@/lib/config/sites";
import { FileSyncToolClient } from "@/app/tools/file-sync/_components/file-sync-tool-client";

export const metadata = {
  title: "跨站点图片同步工具",
  description: "读取源站点图片文件，并批量同步到目标站点。",
};

export default function FileSyncToolPage() {
  const siteOptions = listAvailableSiteOptions();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 md:px-8">
      <div className="mx-auto mb-5 flex w-full max-w-[1400px] items-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          返回首页
        </Link>
        <Link
          href="/tools/image-upload"
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          去上传工具
        </Link>
      </div>

      {siteOptions.length > 1 ? (
        <FileSyncToolClient siteOptions={siteOptions} />
      ) : (
        <div className="mx-auto w-full max-w-3xl rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          跨站点同步至少需要两个已配置站点。请先在 `.env.local` 中配置至少两组
          `*_SHOPIFY_STORE_DOMAIN` 与 `*_SHOPIFY_ADMIN_ACCESS_TOKEN`。
        </div>
      )}
    </main>
  );
}
