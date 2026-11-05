import { useState } from "react";
import type { BookData } from "../../types";
import { useUIContext } from "../../context/hooks";
import RealViewCard from "./RealViewCard";
import styles from "./RightDrawer.module.css";
import BookCover from "../BookCover/BookCover";
import { getContinent } from "../../utils/regionUtils";
import { updateBook } from "../../api/booksApi";

interface RightDrawerProps { book: BookData | null; }

export default function RightDrawer({ book }: RightDrawerProps) {
  const { state, dispatch } = useUIContext();
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const isSaved = book ? state.readingListBookIds.includes(book.id) : false;
  const bookUrl = book ? state.bookUrlOverrides[book.id] || book.url || "" : "";
  const viewBook = book ? { ...book, ...(state.bookOverrides[book.id] || {}) } : null;

  const isEditing = Boolean(book && editingBookId === book.id);

  const handleToggle = () => dispatch({ type: "TOGGLE_RIGHT_DRAWER" });
  const handleClose = () => dispatch({ type: "SELECT_BOOK", payload: null });
  const updateText = (key: keyof BookData, value: string) => {
    if (!book) return;
    dispatch({ type: "UPDATE_BOOK_OVERRIDE", payload: { bookId: book.id, patch: { [key]: value } } });
    updateBook(book.id, { [key]: value }).catch((error) => window.alert(error instanceof Error ? error.message : "内容保存失败，请稍后重试"));
  };
  const updateTags = (value: string) => {
    if (!book) return;
    const tags = value.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean);
    dispatch({ type: "UPDATE_BOOK_OVERRIDE", payload: { bookId: book.id, patch: { tags } } });
    updateBook(book.id, { tags }).catch((error) => window.alert(error instanceof Error ? error.message : "标签保存失败，请稍后重试"));
  };
  const updateUrl = (value: string) => {
    if (!book) return;
    const trimmed = value.trim();
    const url = trimmed && !/^https?:\/\//i.test(trimmed) ? `https://${trimmed}` : trimmed;
    dispatch({ type: "SET_BOOK_URL", payload: { bookId: book.id, url } });
    updateBook(book.id, { url: url || undefined }).catch((error) => window.alert(error instanceof Error ? error.message : "链接保存失败，请稍后重试"));
  };

  return (
    <>
      <button className={`glass-strong ${styles.toggleBtn}`} onClick={handleToggle} style={{ right: state.isRightDrawerOpen ? "calc(var(--right-drawer-width) - 14px)" : "0px" }}>
        <span>{state.isRightDrawerOpen ? "▶" : "◀"}</span>
      </button>

      <aside className={`glass ${styles.drawer}`} style={{ transform: state.isRightDrawerOpen ? "translateX(0)" : "translateX(100%)" }}>
        {!book || !viewBook ? (
          <div className={styles.empty}><span className={styles.emptyIcon}>🗺️</span><p>点击地图上的书籍<br />或左侧列表中的书名<br />以查看详细信息</p></div>
        ) : (
          <>
            <div className={styles.colorBar} style={{ background: viewBook.color }} />
            <div className={styles.scrollArea}>
              <div className={styles.drawerHeader}>
                <button className={styles.editBtn} type="button" onClick={() => setEditingBookId(isEditing ? null : book.id)}>{isEditing ? "完成" : "编辑"}</button>
                <button className={styles.closeBtn} onClick={handleClose}>×</button>
                <div className={styles.headerCover}><BookCover book={viewBook} /></div>

                {isEditing ? (
                  <div className={styles.editForm}>
                    <p className={styles.editHint}>修改会实时保存到当前浏览器</p>
                    <label>书名<input value={viewBook.title} onChange={(event) => updateText("title", event.target.value)} /></label>
                    <label>作者<input value={viewBook.author} onChange={(event) => updateText("author", event.target.value)} /></label>
                    <label>所属国家<input value={viewBook.country} onChange={(event) => updateText("country", event.target.value)} /></label>
                    <label>城市 / 地点<input value={viewBook.city} onChange={(event) => updateText("city", event.target.value)} /></label>
                    <label>年代<input value={viewBook.century} onChange={(event) => updateText("century", event.target.value)} /></label>
                    <label>标签<input value={viewBook.tags.join(", ")} onChange={(event) => updateTags(event.target.value)} /></label>
                    <label>图书 URL<input value={bookUrl} onChange={(event) => updateUrl(event.target.value)} placeholder="https://..." /></label>
                    <label>引用<textarea value={viewBook.quote} onChange={(event) => updateText("quote", event.target.value)} rows={4} /></label>
                    <label>内容简介<textarea value={viewBook.desc} onChange={(event) => updateText("desc", event.target.value)} rows={7} /></label>
                    <label>实景名称<input value={viewBook.realViewName} onChange={(event) => updateText("realViewName", event.target.value)} /></label>
                    <label>实景引用<textarea value={viewBook.realViewQuote} onChange={(event) => updateText("realViewQuote", event.target.value)} rows={3} /></label>
                  </div>
                ) : (
                  <>
                    <h2>{viewBook.title}</h2>
                    <span className={styles.author}>{viewBook.author}</span>
                    <div className={styles.regionMeta}>
                      <button type="button" onClick={() => dispatch({ type: "SET_REGION_FILTER", payload: { country: getContinent(viewBook.country) } })}>{getContinent(viewBook.country)}</button>
                      <span>·</span>
                      <button type="button" onClick={() => dispatch({ type: "SET_REGION_FILTER", payload: { country: viewBook.country } })}>{viewBook.country}</button>
                    </div>
                    <button type="button" className={`${styles.saveBookBtn} ${isSaved ? styles.saveBookBtnActive : ""}`} onClick={() => dispatch({ type: "TOGGLE_READING_LIST_BOOK", payload: viewBook.id })} aria-pressed={isSaved}>{isSaved ? "♥ 已收藏到我的书单" : "♡ 加入我的书单"}</button>
                    {bookUrl && <a className={styles.bookUrl} href={bookUrl} target="_blank" rel="noreferrer">打开图书链接 ↗</a>}
                    <div className={styles.tags}>{viewBook.tags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}</div>
                    <span className={styles.century}>{viewBook.century}</span>
                  </>
                )}
              </div>

              {!isEditing && (
                <>
                  <div className={styles.quoteBlock}><span className={styles.quoteMark}>"</span><p>{viewBook.quote}</p></div>
                  <div className={styles.section}><h3>内容简介</h3><p className={styles.desc}>{viewBook.desc}</p></div>
                  {viewBook.isTrajectory && viewBook.path && <div className={styles.section}><h3>流浪路线</h3><div className={styles.pathList}>{viewBook.path.map((node, idx) => <div key={idx} className={styles.pathNode}><div className={styles.pathDot} style={{ background: viewBook.color }} /><div className={styles.pathInfo}><span className={styles.pathName}>{node.name}</span><span className={styles.pathYear}>{node.year}</span><p>{node.info}</p></div></div>)}</div></div>}
                  {viewBook.realViewName && <div className={styles.section}><h3>圣地巡礼</h3><RealViewCard url={viewBook.realViewUrl || undefined} name={viewBook.realViewName || viewBook.city} quote={viewBook.realViewQuote || undefined} /></div>}
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
