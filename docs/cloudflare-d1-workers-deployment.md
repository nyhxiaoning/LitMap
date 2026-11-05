# LitMap 接入 Cloudflare D1 与 Workers：部署手册

本文记录本项目已经使用的接入方式，供新环境首次部署、后续更新和故障排查复用。命令均在项目根目录执行。

## 1. 架构与配置对照

浏览器访问同源 Worker：静态页面由 `ASSETS` 提供，`/api/*` 由 `worker/index.ts` 处理，Worker 通过 `DB` binding 读写 D1。前端入口 `src/api/booksApi.ts` 在页面启动时请求 `GET /api/books`；请求失败时回退到内置的 `src/data/books.ts`。单独执行 `npm run dev` 只启动 Vite，不会启动 D1 接口。

| 配置 | 本次部署的值 | 下一次换环境时 |
| --- | --- | --- |
| Worker 名称 | `litmap` | 改 `wrangler.jsonc` 的 `name` |
| D1 数据库名称 | `booksql` | 改 `database_name` 及 `package.json` 的迁移命令 |
| D1 数据库 ID | `51fd88ae-cd5e-4df2-9ec4-63fbd9a5a8c4` | 改 `database_id` |
| D1 binding | `DB` | 与 `worker/types.ts`、`worker/index.ts` 保持一致 |
| 静态资源 binding | `ASSETS` | 对应 `dist` 构建目录 |
| 管理员密钥 | Worker secret `ADMIN_TOKEN` | 每个 Worker 单独设置，不写入仓库 |

相关文件：`wrangler.jsonc`、`worker/migrations/0001_books.sql`、`scripts/export-d1-seed.ts`、`db/seed.sql`、`worker/index.ts`、`src/api/booksApi.ts`。

## 2. 前置准备

1. 准备 Cloudflare 账号和一个 D1 数据库。新库可以在控制台创建，或运行 `npx wrangler d1 create <数据库名>`；记录返回的数据库 ID。
2. 安装依赖：`npm install`。`wrangler` 是本项目的开发依赖。
3. 登录 Cloudflare：交互式终端执行 `npx wrangler login`，再运行 `npx wrangler whoami` 核对账号。CI 或无浏览器环境需配置有 Workers 与 D1 权限的 `CLOUDFLARE_API_TOKEN`；不要把 Token 提交到仓库。
4. 新数据库先修改 `wrangler.jsonc` 中的 `database_name`、`database_id`。迁移命令目前硬编码了 `booksql`，换库时同步修改 `package.json`，或直接用下面的通用命令将 `booksql` 替换成新名称。

## 3. 首次初始化空数据库

先确认目标库：

```bash
npx wrangler d1 info booksql
npx wrangler d1 execute booksql --remote --command='SELECT name FROM sqlite_master WHERE type = "table"'
```

确认账号、数据库 ID 和库里原有内容后执行：

```bash
# 创建 books 表与索引；迁移只需应用一次，重复运行会跳过已应用版本
npm run db:migrate:remote

# 从 src/data/books.ts 生成 SQL；地区 JSON 有变化时先运行 npm run build-data
npm run db:seed

# 仅在空库初始化，或明确需要覆盖同 ID 书目时执行
npx wrangler d1 execute booksql --remote --file=db/seed.sql

# 核对导入结果（本次数据集为 362 本）
npx wrangler d1 execute booksql --remote --command='SELECT COUNT(*) AS count FROM books'
```

`db/seed.sql` 使用 `INSERT OR REPLACE`：同 ID 的线上图书会被本地生成数据覆盖，可能抹去管理后台中的编辑。非空库的日常部署**不要重跑 seed**。需要有选择地同步新书时，应先比对数据库内容并使用单独的增量导入方案。D1 不接受 seed 文件中的显式 `BEGIN TRANSACTION` / `COMMIT`；当前导出脚本已去掉这两句。

## 4. 管理员写入权限

公开读接口可匿名访问；`POST`、`PATCH`、`DELETE` 需要 Worker secret `ADMIN_TOKEN`。首次启用管理功能：

```bash
npx wrangler secret put ADMIN_TOKEN
```

按终端提示输入自己生成的高强度随机密钥。前端管理界面第一次保存遇到 401 时会提示输入同一密钥，并放入当前标签页的 `sessionStorage`。关闭该标签页后需要重新输入。密钥不要写到 `wrangler.jsonc`、`.env`、文档或聊天记录里。没有设置 Worker secret 时，公开读可用，写接口始终返回 401。

## 5. 构建与部署

```bash
npm run typecheck:worker
npm run build
npm run cf:deploy
```

`cf:deploy` 会再运行一次构建，然后执行 `wrangler deploy`，上传 `dist` 静态资源与 Worker 脚本。本次 Worker 地址为 `https://litmap.henryheng1119.workers.dev`；换账号或 Worker 名称后以部署输出为准。后续仅修改页面或 API 时，只需构建并部署；只有新 migration 才需要再次运行迁移命令。

本地连 D1 的方式：

```bash
npm run db:migrate:local
npm run db:seed
npx wrangler d1 execute booksql --local --file=db/seed.sql
npm run cf:dev
```

`cf:dev` 提供同源静态页面与本地 D1。单独 `npm run dev` 则使用 Vite 页面和内置数据回退。不要将本地 `--local` 和线上 `--remote` 混用。

## 6. 上线验收

```bash
npx wrangler d1 info booksql
npx wrangler d1 execute booksql --remote --command='SELECT COUNT(*) AS count FROM books'
curl -i https://litmap.henryheng1119.workers.dev/api/health
curl -sS https://litmap.henryheng1119.workers.dev/api/books
```

预期 `health` 返回 `{"ok":true}`，图书 API 返回 `books` 数组，页面能显示地图与图书。验证管理写入时建议新增一条测试书，刷新确认仍在，再通过管理界面删除；需要先配置 `ADMIN_TOKEN`。如果当前网络无法连接 `workers.dev`，以 Wrangler 的部署结果及远程 D1 行数为初步证据，换可访问该域名的网络再做页面/API 验收，不能把部署成功等同于页面已验收。

## 7. 常见问题与数据边界

| 现象 | 检查与处理 |
| --- | --- |
| `Couldn't find a D1 DB with the name or binding 'litmap'` | `litmap` 是 Worker 名称；D1 命令应使用实际数据库名 `booksql`，并核对 `wrangler.jsonc`。 |
| `CLOUDFLARE_API_TOKEN` 错误 | 无交互环境需要 Token；本机运行 `npx wrangler login`。 |
| `BEGIN TRANSACTION` 被拒绝 | 重新运行当前 `npm run db:seed`，确认 SQL 不含显式事务语句。 |
| 写操作返回 401 | 检查 Worker secret `ADMIN_TOKEN` 是否设置，管理界面输入的密钥是否一致。 |
| 页面显示旧内容 | 前端在 API 失败时回退内置书库；检查 `/api/books`、D1 绑定、网络和浏览器本地覆盖数据。 |
| 管理界面刷新后数据不一致 | 旧版本的自定义书与覆盖字段仍可能来自浏览器 `localStorage`，会盖过 D1 返回值；清理前先备份浏览器数据。 |
| `wrangler` 下载失败 | 检查网络及 npm registry；本项目已在 `devDependencies` 声明 Wrangler。 |

当前 API 提供 `GET /api/books`、`POST /api/books`、`PATCH /api/books/:id`、`DELETE /api/books/:id` 和 `GET /api/health`。`我的书单` 仍保存在浏览器 `localStorage`，未实现跨设备同步。现有详情编辑会先更新浏览器状态再尝试写入 D1；写入失败会报错，但浏览器状态可能暂时保留修改，需刷新页面并核对线上数据。
