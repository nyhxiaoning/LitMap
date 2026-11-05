<p align="center">
  <img src="public/favicon.svg" width="80" alt="LitMap Logo" />
</p>

<h1 align="center">LitMap · 文学世界时空地图</h1>

<p align="center">
  <em>"语言的边界就是世界的边界"——维特根斯坦</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript" alt="TypeScript 6" />
  <img src="https://img.shields.io/badge/Vite-8.0-646cff?logo=vite" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet" alt="Leaflet 1.9" />
</p>

---

## 📖 项目简介

LitMap 是一个交互式文学地图可视化平台。它将世界文学名著按地理坐标和创作年代进行索引，在地图上以实体书封面的形式呈现。用户可以在世界地图上缩放、漫游，按照时间轴筛选不同世纪的作品，查看流浪文学的完整路线轨迹，并通过实景图片进行"圣地巡礼"。

---

## 🛠 技术栈

| 层面 | 技术选型 |
|------|----------|
| 框架 | React 19 + TypeScript 6 |
| 构建 | Vite 8 |
| 地图引擎 | Leaflet 1.9 + react-leaflet 5 |
| 样式 | CSS Modules + 自定义 CSS 变量体系 |
| 状态管理 | React Context + useReducer（双 slice 拆分，按需重渲染） |

---

## 📁 项目结构

```
code/
├── public/
│   ├── favicon.svg
│   └── covers/              # 书籍封面图片
├── data/
│   ├── douban-cache.json    # 豆瓣元数据缓存
│   ├── realview-cache.json  # 实景图片缓存
│   └── regions/             # 按地区组织的书籍 JSON
├── scripts/
│   ├── build-data.ts        # 合并地区文件 + 缓存 → src/data/books.ts
│   ├── fetch-douban-book.ts # 从豆瓣获取单本书元数据
│   ├── fetch-cover.ts       # 下载单本书封面
│   ├── batch-fetch-covers.ts# 批量从 Open Library 获取封面
│   └── fetch-realviews.ts   # 从 Wikipedia 获取实景图
├── src/
│   ├── main.tsx             # 入口
│   ├── App.tsx              # 根组件
│   ├── components/
│   │   ├── MapView/         # 地图视图 + 封面画廊
│   │   ├── TopBar/          # 顶部搜索栏
│   │   ├── LeftPanel/       # 左侧图书索引/文学导览
│   │   ├── RightDrawer/     # 右侧详情抽屉 + 实景卡片
│   │   ├── BottomTimeline/  # 底部时间轴滑块
│   │   ├── Lightbox/        # 全屏毛玻璃灯箱
│   │   └── ErrorBoundary.tsx# 错误边界
│   ├── context/             # 状态管理
│   ├── data/                # 书籍数据 + 文学导览数据
│   ├── types/               # TypeScript 类型定义
│   ├── utils/               # 工具函数
│   └── styles/              # 全局 CSS 变量 + 样式
├── package.json
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

---

## 🚀 运行方式

**环境要求**：Node.js ≥ 18、npm ≥ 9

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器访问 `http://localhost:5173` 即可查看。

```bash
# 生产构建
npm run build

# 预览构建产物
npm run preview
```

## Cloudflare Workers + D1

完整的首次接入、部署和排错流程见 [Cloudflare D1 + Workers 部署手册](docs/cloudflare-d1-workers-deployment.md)。

项目已包含 Cloudflare Worker API 和 D1 migration。前端部署到 Worker 后，会优先从 `/api/books` 读取 D1 数据；本地 `npm run dev` 没有 Worker API 时会自动回退到 `src/data/books.ts`。

首次接入当前 D1 数据库：

```bash
# 生成当前 362 本图书的 D1 导入 SQL
npm run db:seed

# 应用表结构到远程 D1
npm run db:migrate:remote

# 将初始书目导入远程 D1
npx wrangler d1 execute booksql --remote --file=db/seed.sql

# 本地启动 Worker + Vite 构建产物
npm run cf:dev

# 部署 Worker 和 dist 静态资源
npm run cf:deploy
```

部署后的公开读接口无需登录。新增、编辑、删除图书需要管理员密钥：在终端执行 `npx wrangler secret put ADMIN_TOKEN`，按提示输入一段仅管理员知道的随机密钥。管理页面首次保存时输入同一密钥；浏览器只在本次会话中保存它。未配置该密钥时，写接口返回 401。

`wrangler.jsonc` 已配置 D1 binding `DB` 和静态资源 binding `ASSETS`，目标数据库名称为 `booksql`；`database_id` 已填入当前数据库 ID。

管理后台的新增、编辑、删除和图书链接修改会写入 D1。当前项目没有登录系统，“我的书单”仍按浏览器保存；如果后续需要跨设备书单，再增加用户认证和用户表即可。

---
## ⚠️ 注意
由于地图引擎的缘故，建议打开🪜使用
