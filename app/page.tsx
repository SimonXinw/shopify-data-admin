import Link from "next/link";
import { ArrowRight, CloudUpload, Images, PackageSearch, Shuffle } from "lucide-react";

const tools = [
  {
    index: "工具 01",
    title: "批量上传图片到 Shopify",
    description:
      "支持多图上传，通过 Shopify staged upload + fileCreate 流程写入 Content > Files。",
    href: "/tools/image-upload",
    Icon: CloudUpload,
  },
  {
    index: "工具 02",
    title: "页面媒体提取",
    description:
      "输入页面 URL 抓取图片与视频链接，支持多选复制、单张下载与批量 ZIP；亦可手动添加 URL 或从 JSON 提取 Shopify 图片。",
    href: "/tools/image-download",
    Icon: Images,
  },
  {
    index: "工具 03",
    title: "跨站点图片同步",
    description:
      "读取源站点图片文件列表，支持单选/多选后同步到其他站点，并查看每项同步结果与目标 CDN。",
    href: "/tools/file-sync",
    Icon: Shuffle,
  },
  {
    index: "工具 04",
    title: "跨站点产品同步",
    description:
      "从源站点拉取产品列表，多选后同步到目标站点；自动避让已占用的 handle，并复制变体、图片与元字段（受 API 与目标站 metafield 定义限制）。",
    href: "/tools/product-sync",
    Icon: PackageSearch,
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-zinc-900">Shopify Data Admin</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            用于跨站点的数据工具控制台。当前提供 Shopify Files 批量图片上传、远程图片下载、跨站图片同步与跨站产品同步；后续可扩展元字段、元对象等更多跨店铺数据治理能力。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tools.map(({ index, title, description, href, Icon }) => (
            <article
              key={href}
              className="group flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
            >
              <div className="relative flex h-28 items-center justify-center overflow-hidden border-b border-zinc-100 bg-zinc-50">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-100/70 transition group-hover:scale-110" />
                <div className="absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-zinc-200/70 transition group-hover:scale-110" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-800 shadow-sm">
                  <Icon className="h-8 w-8" />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="text-xs font-medium uppercase tracking-wider text-indigo-600">
                  {index}
                </div>
                <h2 className="mt-2 text-xl font-semibold text-zinc-900">{title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-zinc-600">{description}</p>

                <Link
                  href={href}
                  className="mt-5 inline-flex items-center justify-between rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
                >
                  <span>进入工具</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
