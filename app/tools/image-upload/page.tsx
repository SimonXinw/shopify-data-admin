import Link from "next/link";

import { listAvailableSiteOptions } from "@/lib/config/sites";
import { UploadToolClient } from "@/app/tools/image-upload/_components/upload-tool-client";

export const metadata = {
  title: "批量上传图片工具",
  description: "批量上传图片到 Shopify Files，并作为跨店铺数据工具的基础模块。",
};

export default function ImageUploadToolPage() {
  const siteOptions = listAvailableSiteOptions();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 md:px-8">
      <div className="mx-auto mb-5 w-full max-w-6xl">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            返回首页
          </Link>
          <Link
            href="/tools/file-sync"
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            去跨店铺同步
          </Link>
        </div>
      </div>

      <UploadToolClient siteOptions={siteOptions} />
    </main>
  );
}
