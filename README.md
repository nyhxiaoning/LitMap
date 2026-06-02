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

---
## ⚠️ 注意
由于地图引擎的缘故，建议打开🪜使用