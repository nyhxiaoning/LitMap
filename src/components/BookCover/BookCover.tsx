import { useState } from "react";
import type { BookData } from "../../types";
import styles from "./BookCover.module.css";

interface BookCoverProps {
  book: Pick<BookData, "title" | "coverUrl" | "color">;
  className?: string;
}

export default function BookCover({ book, className = "" }: BookCoverProps) {
  const [hasFailed, setHasFailed] = useState(!book.coverUrl);

  if (hasFailed) {
    return (
      <div
        className={`${styles.coverFallback} ${className}`}
        role="img"
        aria-label={book.title}
      >
        <span>{book.title}</span>
        <small>LITMAP</small>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={book.coverUrl}
      alt={book.title}
      loading="lazy"
      onError={() => setHasFailed(true)}
    />
  );
}
