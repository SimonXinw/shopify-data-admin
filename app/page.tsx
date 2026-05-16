import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-zinc-900">Shopify Data Admin</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            用于跨站点的数据工具控制台。当前提供 Shopify Files 批量图片上传、跨站图片同步与跨站产品同步；后续可扩展元字段、元对象等更多跨店铺数据治理能力。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-indigo-600">工具 01</div>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900">批量上传图片到 Shopify</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              支持多图上传，通过 Shopify staged upload + fileCreate 流程写入 Content &gt; Files。
            </p>

            <Link
              href="/tools/image-upload"
              className="mt-5 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              进入工具
            </Link>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-indigo-600">工具 02</div>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900">跨站点图片同步</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              读取源站点图片文件列表，支持单选/多选后同步到其他站点，并查看每项同步结果与目标 CDN。
            </p>

            <Link
              href="/tools/file-sync"
              className="mt-5 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              进入工具
            </Link>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-indigo-600">工具 03</div>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900">跨站点产品同步</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              从源站点拉取产品列表，多选后同步到目标站点；自动避让已占用的 handle，并复制变体、图片与元字段（受 API 与目标站 metafield 定义限制）。
            </p>

            <Link
              href="/tools/product-sync"
              className="mt-5 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              进入工具
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
