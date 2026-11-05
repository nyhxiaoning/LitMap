import { useMemo } from "react";
import type { BookData } from "../../types";
import { useUIContext } from "../../context/hooks";
import BookCover from "../BookCover/BookCover";
import styles from "./ReadingList.module.css";

interface ReadingListProps {
  books: BookData[];
}

export default function ReadingList({ books }: ReadingListProps) {
  const { state, dispatch } = useUIContext();
  const savedBooks = useMemo(
    () => state.readingListBookIds
      .map((id) => books.find((book) => book.id === id))
      .filter((book): book is BookData => Boolean(book)),
    [books, state.readingListBookIds],
  );

  if (!state.isReadingListOpen) return null;

  return (
    <aside className={`glass-strong ${styles.panel}`} aria-label="我的书单">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>MY LIBRARY</p>
          <h2>我的书单</h2>
          <p className={styles.subtitle}>收藏的作品会在刷新后继续保留</p>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => dispatch({ type: "TOGGLE_READING_LIST" })}
          aria-label="关闭我的书单"
        >×</button>
      </div>

      {savedBooks.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>♡</span>
          <p>还没有收藏图书</p>
          <span>在左侧书单、阅读桌或详情抽屉中点击爱心加入。</span>
        </div>
      ) : (
        <div className={styles.list} role="list">
          {savedBooks.map((book) => (
            <article key={book.id} className={styles.item} role="listitem">
              <button
                type="button"
                className={styles.bookButton}
                onClick={() => dispatch({ type: "SELECT_BOOK", payload: book.id })}
                aria-label={`查看《${book.title}》详情`}
              >
                <span className={styles.cover}><BookCover book={book} /></span>
                <span className={styles.info}>
                  <strong>{book.title}</strong>
                  <small>{book.author}</small>
                  <span>{book.city} · {book.century}</span>
                </span>
              </button>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => dispatch({ type: "TOGGLE_READING_LIST_BOOK", payload: book.id })}
                aria-label={`从我的书单移除：${book.title}`}
              >
                移除
              </button>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}
