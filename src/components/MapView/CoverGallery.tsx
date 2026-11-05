import { useEffect, useRef, useCallback } from "react";
import type { BookData } from "../../types";
import { useUIContext } from "../../context/hooks";
import styles from "./CoverGallery.module.css";
import BookCover from "../BookCover/BookCover";
import { getContinent } from "../../utils/regionUtils";

interface CoverGalleryProps {
  books: BookData[];
}

export default function CoverGallery({ books }: CoverGalleryProps) {
  const { dispatch } = useUIContext();
  const galleryRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    dispatch({ type: "SET_GALLERY_BOOKS", payload: null });
  }, [dispatch]);

  const handleSelect = useCallback((book: BookData) => {
    dispatch({ type: "SET_GALLERY_BOOKS", payload: null });
    dispatch({ type: "SELECT_BOOK", payload: book.id });
  }, [dispatch]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // Focus trap + auto-focus on mount
  useEffect(() => {
    // Capture the previously focused element BEFORE we shift focus into the gallery
    const prevFocused = document.activeElement as HTMLElement | null;

    const firstFocusable = galleryRef.current?.querySelector<HTMLElement>(
      'button, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    // Restore focus on unmount to the element that was focused before the gallery opened
    return () => {
      prevFocused?.focus();
    };
  }, []);

  const galleryTitle = `${books[0]?.city ?? ""} · ${books.length} 部作品`;

  return (
    <div
      className={styles.overlay}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={galleryTitle}
    >
      <div
        ref={galleryRef}
        className={`glass-strong ${styles.gallery}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="关闭画廊"
        >
          ×
        </button>
        <h3 className={styles.title}>
          {galleryTitle}
        </h3>
        <div className={styles.coverRow} role="list">
          {books.map((book) => (
            <div
              key={book.id}
              className={styles.coverItem}
              onClick={() => handleSelect(book)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(book);
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  const next = (e.currentTarget.nextElementSibling ?? e.currentTarget.parentElement?.firstElementChild) as HTMLElement | null;
                  next?.focus();
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  const prev = (e.currentTarget.previousElementSibling ?? e.currentTarget.parentElement?.lastElementChild) as HTMLElement | null;
                  prev?.focus();
                }
              }}
              tabIndex={0}
              role="listitem"
              aria-label={`${book.title} — ${book.author}`}
            >
              <div className={styles.coverWrapper}>
                <BookCover book={book} />
              </div>
              <span className={styles.bookTitle}>{book.title}</span>
              <span className={styles.bookAuthor}>{book.author}</span>
              <span className={styles.bookLocation}>{getContinent(book.country)} · {book.country}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
