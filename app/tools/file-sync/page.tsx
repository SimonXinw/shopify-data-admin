import Link from "next/link";

import { listAvailableSiteOptions } from "@/lib/config/sites";
import { FileSyncToolClient } from "@/app/tools/file-sync/_components/file-sync-tool-client";

export const metadata = {
  title: "跨店铺图片同步工具",
  description: "读取源店铺图片文件，并批量同步到目标店铺。",
};

export default function FileSyncToolPage() {
  const siteOptions = listAvailableSiteOptions();

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50 px-4 py-8 md:px-8">
      <div className="mx-auto mb-5 flex w-full max-w-[1400px] shrink-0 items-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          返回首页
        </Link>
        <Link
          href="/tools/product-sync"
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          产品同步
        </Link>
        <Link
          href="/tools/image-upload"
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          去上传工具
        </Link>
      </div>

      <FileSyncToolClient siteOptions={siteOptions} />
    </main>
  );
}
