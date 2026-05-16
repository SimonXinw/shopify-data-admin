# Shopify Data Admin

基于 **Next.js App Router** 的内部工具控制台，用于跨多个 Shopify 站点的文件与数据操作。当前主要围绕 **Shopify Admin GraphQL**（Files / staged upload）实现批量上传与跨站点同步，后续会扩展到元字段、元对象、产品数据等更多跨店铺数据治理能力。

## 技术栈

- **Next.js** `16.x`（App Router）、**React** `19.x`、**TypeScript** `5.x`
- **Tailwind CSS** `4.x`
- 服务端逻辑使用 `server-only` 模块；所有调用 Shopify 的 API Route 显式声明 `runtime = "nodejs"`
- 包管理器：**pnpm**（`package.json` 的 `packageManager` 字段固定版本；有 `pnpm-lock.yaml`，请勿用 npm / yarn 安装。建议先执行 `corepack enable`，再 `pnpm install`。）

> 注意：本项目使用的 Next.js `16.x` 与训练数据中常见版本存在 break change，开发前请参考 `node_modules/next/dist/docs/` 中对应文档与本仓库 `AGENTS.md`。

## 项目启动

```bash
pnpm install
pnpm dev
```

常用脚本：

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动本地开发服务器（默认 [http://localhost:3000](http://localhost:3000)） |
| `pnpm build` | 生产构建 |
| `pnpm start` | 运行生产构建后的服务 |
| `pnpm lint` | 运行 ESLint 检查 |

首次启动前请按照下面「环境变量」章节，复制 `.example.env` 为 `.env.local` 并填入至少一个站点的真实配置。

## 页面与业务模块

应用全部路由在 `app/` 下，使用 App Router 文件式路由。

| 路径 | 页面 | 业务说明 |
| --- | --- | --- |
| `/` | 工具控制台首页 | 列出当前已上线的工具卡片入口，作为未来更多数据工具的导航中心。 |
| `/tools/image-upload` | 批量上传图片到 Shopify | 选择站点 → 多选本地图片 → 调用后端走 `stagedUploadsCreate` + `fileCreate` 写入对应站点 Shopify 后台 `Content > Files`，返回每个文件的上传结果与 CDN 链接。 |
| `/tools/file-sync` | 跨站点图片同步 | 选择源站点拉取图片列表，单选 / 多选后批量同步到一个或多个目标站点，并展示每条同步结果与目标站点 CDN URL。需要至少配置 2 个站点才可使用。 |

对应的后端 HTTP 接口：

| 方法 | 路径 | 入参 | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/tools/shopify/files/upload` | `multipart/form-data`：`siteCode`、`files[]`，可选 `altPrefix` | 批量将本地文件上传到指定站点的 Shopify Files。 |
| `POST` | `/api/tools/shopify/files/list` | JSON：`siteCode`，可选 `first`（默认 250，服务端会裁剪到 1–250） | 列出某站点的图片类型文件。 |
| `POST` | `/api/tools/shopify/files/sync` | JSON：`sourceSiteCode`、`targetSiteCodes[]`（兼容旧字段 `targetSiteCode`）、`fileIds[]` | 将源站点的指定文件同步到一个或多个目标站点。 |

## 目录结构与职责规范

```
shopify-data-admin/
├─ app/                    # Next.js App Router 路由层（页面 + API Route）
│  ├─ page.tsx             # 工具首页
│  ├─ layout.tsx           # 根 layout（字体、全局样式）
│  ├─ globals.css          # 全局样式
│  ├─ tools/
│  │  ├─ image-upload/     # 批量上传图片页面
│  │  │  ├─ page.tsx
│  │  │  └─ _components/   # 仅本页面使用的客户端组件（带下划线，不参与路由）
│  │  └─ file-sync/        # 跨站点同步页面
│  │     ├─ page.tsx
│  │     └─ _components/
│  └─ api/tools/shopify/files/
│     ├─ upload/route.ts   # 批量上传接口
│     ├─ list/route.ts     # 文件列表接口
│     └─ sync/route.ts     # 跨站点同步接口
├─ lib/                    # 服务端业务实现（标记 "server-only"，不可被客户端组件直接 import）
│  ├─ config/
│  │  └─ sites.ts          # 多站点配置：env 读取、可用站点列表、按 siteCode 取配置
│  ├─ constants/
│  │  └─ shopify.ts        # 本工具的 Shopify 常量（API 路径、单批文件上限等）
│  └─ shopify/
│     ├─ admin-client.ts   # 统一发起 Admin GraphQL 请求，处理错误
│     ├─ storefront.ts     # Storefront GraphQL 聚合导出（对外优先从此 import）
│     ├─ storefront/       # Storefront 业务封装（购物车、商品等）
│     ├─ files.ts          # 单站点批量上传逻辑（stagedUploadsCreate → upload → fileCreate）
│     └─ file-sync.ts      # 跨站点文件列表与同步逻辑
├─ src/
│  └─ consts/valerion/     # Valerion 品牌侧共享常量（与前台 / 其它包对齐）
│     ├─ index.ts          # storefront 通用常量（排序、TAGS、GraphQL 路径片段等）
│     ├─ shopify/constants.ts  # Storefront / Admin GraphQL 路径与 API 版本（VALERION_SHOPIFY_*）
│     └─ klaviyo/index.ts  # Klaviyo 相关常量（当前 Admin 工具未直接使用）
├─ public/                 # 静态资源
├─ .example.env            # 环境变量模板（含全部支持站点的示例值）
├─ AGENTS.md               # AI / 协作约定
├─ next.config.ts
├─ tsconfig.json
└─ package.json
```

各目录约定：

- **`app/`**：仅放页面、布局、API Route 与本路由专属组件。本路由专属组件统一放到 `_components/`（下划线前缀，App Router 会忽略其作为路由）。页面层不直接拼装 Shopify GraphQL，业务调用 `lib/` 暴露的函数或 `app/api/...` 接口。
- **`lib/`**：服务端业务模块，**文件首行使用 `import "server-only";`**，禁止在 Client Component 中 import。
  - `lib/config/`：环境与多站点配置读取。
  - `lib/constants/`：项目内引用的常量；如果是与品牌前台共享的常量，应放到 `src/consts/valerion/` 并由此处 re-export，避免双写。
  - `lib/shopify/`：所有 Shopify Admin GraphQL 调用与业务封装。
- **`src/consts/valerion/`**：与 Valerion 前台 / 其它包共用的纯常量，**不允许写副作用 / 不依赖运行时**，方便跨包复用。
- **`public/`**：纯静态资源。
- **根目录**：仅放配置类文件（Next、TS、ESLint、PostCSS、Tailwind、环境模板、AGENTS.md 等）。

## 环境变量

复制 `.example.env` 为 `.env.local`：

```bash
cp .example.env .env.local
```

每个站点一组，使用大写站点码 + 下划线作为前缀：

- `JP_SHOPIFY_STORE_DOMAIN`、`JP_SHOPIFY_ADMIN_ACCESS_TOKEN`
- `US_SHOPIFY_STORE_DOMAIN`、`US_SHOPIFY_ADMIN_ACCESS_TOKEN`
- 其它支持的站点码：`eu`、`de`、`fr`、`uk`、`ca`、`au`、`global`、`cn`

只有当某站点的 **两项** 变量都填写后，该站点才会出现在工具下拉列表中。具体读取与校验见 `lib/config/sites.ts` 的 `listAvailableSiteOptions` / `getSiteConfigOrThrow`。

## Shopify API 版本来源

Admin GraphQL 请求路径与版本号统一来自 **`src/consts/valerion/shopify/constants.ts`** 中的 `VALERION_SHOPIFY_*`，由 `lib/constants/shopify.ts` 透出。升级 Shopify API 版本时只需修改前者，避免在多处硬编码版本字符串。

## 编码与协作规范

- 通用规范：使用 `const` / `let`（禁用 `var`），字符串统一双引号，函数职责单一，命名语义化，详见仓库根目录 / 上层工作区的「编码规范」与「git commit 信息规范」。
- 提交信息使用简体中文 + 类型前缀（`feat: / fix: / chore: / refactor:`）。
- AI / Agent 协作约定见 [`AGENTS.md`](./AGENTS.md)。
- **文档同步约定**：任何代码 / 目录 / 接口 / 环境变量 / 依赖变动都必须在同一次改动中同步本 README 与 `.example.env`。规则见 `AGENTS.md` 的「文档与代码必须保持同步」段，操作流程见 [`.cursor/skills/sync-docs/SKILL.md`](./.cursor/skills/sync-docs/SKILL.md)。
- 上游 Next.js 文档：[Next.js Documentation](https://nextjs.org/docs)。
