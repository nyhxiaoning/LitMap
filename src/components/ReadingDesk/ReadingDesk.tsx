import { useMemo, useState, type CSSProperties } from "react";
import type { BookData } from "../../types";
import { useUIContext } from "../../context/hooks";
import styles from "./ReadingDesk.module.css";
import BookCover from "../BookCover/BookCover";
import { getContinent } from "../../utils/regionUtils";

interface ReadingDeskProps {
  books: BookData[];
  focusedBooks: BookData[] | null;
}

const MAX_DESK_BOOKS = 8;
const DEFAULT_DESK_BOOKS = 6;

export default function ReadingDesk({ books, focusedBooks }: ReadingDeskProps) {
  const { state, dispatch } = useUIContext();
  const [isOpen, setIsOpen] = useState(false);
  const [litBookIds, setLitBookIds] = useState<Set<string>>(() => new Set());

  const displayBooks = useMemo(() => {
    const source = focusedBooks?.length ? focusedBooks : books;
    const sorted = [...source].sort((a, b) => a.rank - b.rank);

    if (state.selectedBookId) {
      const selectedIndex = sorted.findIndex((book) => book.id === state.selectedBookId);
      if (selectedIndex > 0) {
        const [selected] = sorted.splice(selectedIndex, 1);
        sorted.unshift(selected);
      }
    }

    const limit = focusedBooks?.length ? MAX_DESK_BOOKS : DEFAULT_DESK_BOOKS;
    return sorted.slice(0, limit);
  }, [books, focusedBooks, state.selectedBookId]);

  const toggleLamp = (bookId: string) => {
    setLitBookIds((current) => {
      const next = new Set(current);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  };

  if (displayBooks.length === 0) return null;

  return (
    <section className={`${styles.desk} ${isOpen ? styles.open : ""}`} aria-label="书桌阅读展示">
      <button
        type="button"
        className={`glass-strong ${styles.deskToggle}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.toggleLamp} aria-hidden="true">◒</span>
        <span>阅读桌</span>
        <span className={styles.bookCount}>{displayBooks.length} 本</span>
        <span className={styles.chevron} aria-hidden="true">{isOpen ? "⌄" : "⌃"}</span>
      </button>

      <div className={`glass-strong ${styles.deskPanel}`}>
        <div className={styles.deskHeader}>
          <div>
            <p className={styles.eyebrow}>LITMAP · READING DESK</p>
            <h2>给正在阅读的书一盏灯</h2>
          </div>
          <span className={styles.deskHint}>点击封面阅读 · 灯控独立生效</span>
        </div>

        <div className={styles.bookRail} role="list" aria-label="阅读桌上的书">
          {displayBooks.map((book, index) => {
            const isLit = litBookIds.has(book.id);
            const isSaved = state.readingListBookIds.includes(book.id);
            return (
              <article
                key={book.id}
                className={`${styles.bookItem} ${isLit ? styles.lit : styles.dim}`}
                style={{ "--book-index": index } as CSSProperties}
                role="listitem"
              >
                <div className={styles.lampGlow} aria-hidden="true" />
                <button
                  type="button"
                  className={styles.bookButton}
                  onClick={() => dispatch({ type: "SELECT_BOOK", payload: book.id })}
                  aria-label={`阅读《${book.title}》`}
                >
                  <span className={styles.coverFrame}>
                    <BookCover book={book} />
                  </span>
                  <span className={styles.bookTitle}>{book.title}</span>
                  <span className={styles.bookAuthor}>{book.author}</span>
                  <span className={styles.bookRegion}>{getContinent(book.country)} · {book.country}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.saveButton} ${isSaved ? styles.saveButtonActive : ""}`}
                  onClick={() => dispatch({ type: "TOGGLE_READING_LIST_BOOK", payload: book.id })}
                  aria-label={`${isSaved ? "移出" : "加入"}我的书单：${book.title}`}
                  aria-pressed={isSaved}
                >
                  {isSaved ? "♥ 已收藏" : "♡ 收藏"}
                </button>
                <button
                  type="button"
                  className={styles.lampButton}
                  aria-label={`${book.title}${isLit ? "关闭" : "打开"}阅读灯`}
                  aria-pressed={isLit}
                  onClick={() => toggleLamp(book.id)}
                >
                  <span className={styles.lampIcon} aria-hidden="true">☼</span>
                  <span>{isLit ? "灯亮" : "开灯"}</span>
                </button>
              </article>
            );
          })}
        </div>

        <div className={styles.deskEdge} aria-hidden="true" />
      </div>
    </section>
  );
}
