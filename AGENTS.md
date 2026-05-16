<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:keep-docs-in-sync -->
# 文档与代码必须同步

凡是改动了 **对外可见的事实**（目录结构、页面路由、HTTP 接口、环境变量、依赖 / 脚本、对外导出的模块或约定），必须在同一次改动中同步 `README.md` 和 / 或 `.example.env`。

判定与映射细则、何时不需要更新文档，见 `.cursor/skills/sync-docs/SKILL.md`。
<!-- END:keep-docs-in-sync -->

<!-- BEGIN:ui-style-rule -->
# UI 风格约定

改 `app/**/*.tsx`、`components/**/*.tsx` 或 `app/globals.css` 时，遵循 `.cursor/rules/polaris-shadcn-ui.mdc`：shadcn/ui 基座 + Shopify Polaris 灰色调，复杂交互优先用 Radix/shadcn。
<!-- END:ui-style-rule -->
