# Cloudflare Workers D1 接入实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将图书主数据和管理操作接入 Cloudflare Workers + D1，同时保留 Vite 本地回退能力。

**Architecture:** Worker 通过 D1 提供同源 REST API；前端优先请求 API，API 不可用时回退到现有静态数据。D1 保存图书及管理员编辑字段；当前无用户认证，个人书单继续使用浏览器 localStorage。

**Tech Stack:** React 19、Vite、TypeScript、Cloudflare Workers、D1 SQLite、Wrangler。

## Global Constraints

- 不改变现有图书展示和地图交互。
- D1 使用 SQLite 兼容 SQL，不依赖 Node-only API。
- 本地开发在没有 D1 时仍可启动并展示内置数据。
- 管理写入失败时必须给出可识别错误，不静默丢失。

---

### Task 1: D1 schema 与数据导入

**Files:**
- Create: worker/migrations/0001_books.sql
- Create: scripts/export-d1-seed.ts
- Modify: package.json

**Interfaces:**
- Produces D1 table books and seed SQL for the current generated book dataset.
- Adds db:seed command for generating import SQL.

- [ ] 创建包含图书字段、唯一 ID、国家/洲、地图坐标和更新时间的 SQLite 表及索引。
- [ ] 从 src/data/books.ts 生成可执行的 D1 seed SQL。
- [ ] 增加 npm run db:seed 命令。

### Task 2: Worker REST API

**Files:**
- Create: worker/index.ts
- Create: worker/types.ts
- Create: wrangler.jsonc
- Modify: package.json

**Interfaces:**
- GET /api/books → { books: BookData[] }
- POST /api/books → { book: BookData }
- PATCH /api/books/:id → { book: BookData }
- DELETE /api/books/:id → { ok: true }
- GET /api/health → { ok: true }

- [ ] 实现 D1 查询与 JSON 序列化。
- [ ] 实现新增、编辑、删除及基础字段校验。
- [ ] 配置 Workers 静态资源与 D1 binding。
- [ ] 保持 /api/* 与 Vite 静态资源路径隔离。

### Task 3: 前端 API 适配

**Files:**
- Create: src/api/booksApi.ts
- Modify: src/App.tsx
- Modify: src/context/AppContext.tsx
- Modify: src/types/index.ts
- Modify: src/components/ReadingListManager/ReadingListManager.tsx

**Interfaces:**
- fetchBooks(): Promise<BookData[] | null>
- createBook(book): Promise<BookData>
- updateBook(id, patch): Promise<BookData>
- deleteBook(id): Promise<void>

- [ ] 应用启动时请求 /api/books，失败时使用内置数据。
- [ ] 自定义图书新增、编辑、删除同步 D1。
- [ ] 管理编辑入口同步 D1，失败时恢复本地状态并提示。
- [ ] 保留书单、灯光和当前 UI 状态的 localStorage 行为。

### Task 4: 本地与部署验证

**Files:**
- Modify: README.md

- [ ] 运行 npm run build。
- [ ] 检查 migration 与 seed SQL 可被 Wrangler 执行。
- [ ] 补充 D1 创建、迁移、导入和部署命令。
- [ ] 记录 API 不可用时的回退行为。
