import Link from "next/link";

import { listAvailableSiteOptions } from "@/lib/config/sites";
import { UploadToolClient } from "@/app/tools/image-upload/_components/upload-tool-client";

export const metadata = {
  title: "批量上传图片工具",
  description: "批量上传图片到 Shopify Files，并作为跨站点数据工具的基础模块。",
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
            去跨站点同步
          </Link>
        </div>
      </div>

      {siteOptions.length > 0 ? (
        <UploadToolClient siteOptions={siteOptions} />
      ) : (
        <div className="mx-auto w-full max-w-3xl rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          未检测到可用站点配置。请先在 `.env.local` 中配置至少一组
          `*_SHOPIFY_STORE_DOMAIN` 与 `*_SHOPIFY_ADMIN_ACCESS_TOKEN`。
        </div>
      )}
    </main>
  );
}
