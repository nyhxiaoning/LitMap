# 阅读桌与地图展示优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution with task-by-task checkpoints.

**Goal:** 增加可收起的书桌阅读展示区，为每本书提供独立阅读灯，并提升地图初始和选书后的封面可读性。

**Architecture:** 新增独立 `ReadingDesk` 组件，通过现有 UI Context 选择书籍；灯光状态留在组件内部，用书籍 ID 集合管理。地图只修改视野参数和 fit bounds 保护，不改变现有数据、聚类与筛选结构。

**Tech Stack:** React 19、TypeScript、CSS Modules、React Leaflet、Vite。

## Global Constraints

- 不新增依赖。
- 不改变 `BookData`、地图聚类层级和现有 reducer action。
- 灯控必须使用按钮语义和 `aria-pressed`。
- 动画必须遵守现有 `prefers-reduced-motion` 规则。

---

### Task 1: 新增阅读桌组件

**Files:**
- Create: `src/components/ReadingDesk/ReadingDesk.tsx`
- Create: `src/components/ReadingDesk/ReadingDesk.module.css`

**Interfaces:**
- Consumes: `books: BookData[]`, `focusedBooks: BookData[] | null`。
- Produces: 可展开/收起的阅读桌；点击书籍 dispatch `SELECT_BOOK`；灯控通过 `aria-pressed` 维护独立状态。

- [x] **Step 1: 建立展示数据与交互状态**

```tsx
const displayBooks = useMemo(() => {
  const source = focusedBooks?.length ? focusedBooks : books;
  const limit = focusedBooks?.length ? 8 : 6;
  return [...source].sort((a, b) => a.rank - b.rank).slice(0, limit);
}, [books, focusedBooks]);
const [isOpen, setIsOpen] = useState(false);
const [litBookIds, setLitBookIds] = useState<Set<string>>(() => new Set());
```

- [x] **Step 2: 实现桌面、书本卡片和独立灯控**

```tsx
<button type="button" aria-expanded={isOpen} onClick={() => setIsOpen(v => !v)}>
  阅读桌 · {displayBooks.length} 本
</button>
{isOpen && displayBooks.map(book => (
  <article key={book.id} className={litBookIds.has(book.id) ? styles.lit : styles.dim}>
    <button type="button" onClick={() => dispatch({ type: "SELECT_BOOK", payload: book.id })}>
      <img src={book.coverUrl} alt={book.title} />
      <span>{book.title}</span>
    </button>
    <button
      type="button"
      aria-label={`${book.title}${litBookIds.has(book.id) ? "关闭" : "打开"}阅读灯`}
      aria-pressed={litBookIds.has(book.id)}
      onClick={event => { event.stopPropagation(); toggleLamp(book.id); }}
    >灯</button>
  </article>
))}
```

- [x] **Step 3: 添加局部动画与响应式布局**
  - 桌面使用现有玻璃风格和暖琥珀色灯光变量。
  - 展开使用上移/淡入；书本使用延迟入场；灯亮使用光晕和短呼吸动画。
  - 小屏横向滚动书列，避免遮挡地图核心内容。

- [x] **Step 4: 检查组件行为**

Run: `npm run build`
Expected: PASS，且 TypeScript 不报 `BookData` 或 Context 类型错误。

### Task 2: 接入 App 与现有书籍状态

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `books`、`state.areaBooks`。
- Produces: 阅读桌出现在地图与现有面板同一层级，且选书仍复用现有详情抽屉。

- [x] **Step 1: 接入组件**

```tsx
<ReadingDesk books={books} focusedBooks={state.areaBooks} />
```

- [x] **Step 2: 运行 lint**

Run: `npm run lint`
Expected: PASS。

### Task 3: 优化地图视野与动画可读性

**Files:**
- Modify: `src/components/MapView/MapView.tsx`

**Interfaces:**
- Consumes: 现有 Leaflet `map` 实例和选书/区域/搜索状态。
- Produces: 初始缩放 `4.2`、最低缩放 `3.2`、单书选中缩放 `9`，边界自适应不会过度缩小。

- [x] **Step 1: 修改初始和约束缩放**

```tsx
map.setMinZoom(3.2);
map.setMaxZoom(18);
map.flyTo([selectedBook.lat, selectedBook.lng], 9, {
  duration: 0.8,
  easeLinearity: 0.25,
});
```

- [x] **Step 2: 为 fit bounds 增加缩放保护**
  - 区域和搜索的 `flyToBounds` 分别设置 `maxZoom: 7.5` 与 `maxZoom: 8`，避免聚焦结果过度放大；全局 `setMinZoom(3.2)` 负责避免地图缩得过小。

- [x] **Step 3: 运行构建与 lint**

Run: `npm run build && npm run lint`
Expected: 两个命令均 PASS。

### Task 4: 最终检查

**Files:**
- Verify: `src/components/ReadingDesk/ReadingDesk.tsx`
- Verify: `src/components/ReadingDesk/ReadingDesk.module.css`
- Verify: `src/App.tsx`
- Verify: `src/components/MapView/MapView.tsx`

- [x] **Step 1: 检查工作区差异**

Run: `git diff --check && git status --short`
Expected: 无空白错误；只包含本需求相关文件。

- [x] **Step 2: 核对验收行为**
  - 阅读桌开关、每本灯控、封面选书、键盘焦点和 reduced-motion 规则均可从代码路径确认。
  - 记录因 `.git` 只读而无法提交的限制。
