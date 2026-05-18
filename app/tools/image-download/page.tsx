import Link from "next/link";

import { ImageDownloadToolClient } from "@/app/tools/image-download/_components/image-download-tool-client";

export const metadata = {
  title: "页面媒体提取",
  description:
    "输入页面 URL，由服务端抓取 SSR HTML 并提取图片与视频链接，支持多选复制、单张与批量 ZIP 下载。",
};

export default function ImageDownloadToolPage() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 px-4 py-8 md:px-8">
      <div className="mx-auto mb-5 flex w-full max-w-7xl shrink-0 items-center gap-2">
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
        <Link
          href="/tools/file-sync"
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          跨站图片同步
        </Link>
      </div>

      <ImageDownloadToolClient />
    </main>
  );
}
