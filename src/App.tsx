import { useEffect, useMemo, useState } from "react";
import { useUIContext } from "./context/hooks";
import books from "./data/books";
import type { BookData } from "./types";
import { configureBooksApi, fetchBooks } from "./api/booksApi";
import MapView from "./components/MapView/MapView";
import TopBar from "./components/TopBar/TopBar";
import LeftPanel from "./components/LeftPanel/LeftPanel";
import RightDrawer from "./components/RightDrawer/RightDrawer";
import BottomTimeline from "./components/BottomTimeline/BottomTimeline";
import CoverGallery from "./components/MapView/CoverGallery";
import Lightbox from "./components/Lightbox/Lightbox";
import ReadingDesk from "./components/ReadingDesk/ReadingDesk";
import ReadingList from "./components/ReadingList/ReadingList";
import ReadingListManager from "./components/ReadingListManager/ReadingListManager";
import styles from "./App.module.css";

function App() {
  const { state } = useUIContext();
  const [remoteBooks, setRemoteBooks] = useState<BookData[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchBooks().then((result) => {
      if (active) setRemoteBooks(result);
    });
    return () => { active = false; configureBooksApi(false); };
  }, []);

  const allBooks = useMemo(() => {
    const localCustomById = new Map(state.customBooks.map((book) => [book.id, book]));
    const sourceBooks = remoteBooks ?? books;
    const merged = sourceBooks.map((book) => localCustomById.get(book.id) ?? book);
    const knownIds = new Set(merged.map((book) => book.id));
    for (const customBook of state.customBooks) {
      if (!knownIds.has(customBook.id)) merged.push(customBook);
    }
    return merged.map((book) => ({
      ...book,
      ...(state.bookOverrides[book.id] || {}),
      ...(state.bookUrlOverrides[book.id] ? { url: state.bookUrlOverrides[book.id] } : {}),
    }));
  }, [remoteBooks, state.customBooks, state.bookOverrides, state.bookUrlOverrides]);
  const selectedBook = state.selectedBookId
    ? allBooks.find((b) => b.id === state.selectedBookId) ?? null
    : null;

  return (
    <div className={styles.container}>
      <MapView books={allBooks} />

      <ReadingDesk books={allBooks} focusedBooks={state.areaBooks} />

      <TopBar />

      <ReadingList books={allBooks} />
      <ReadingListManager books={allBooks} />

      <LeftPanel
        books={allBooks}
        areaBooks={state.areaBooks}
        areaLabel={state.areaLabel}
      />

      <RightDrawer book={selectedBook} />

      <BottomTimeline />

      {state.galleryBooks && <CoverGallery books={state.galleryBooks} />}

      {state.lightboxImage && (
        <Lightbox
          url={state.lightboxImage.url}
          name={state.lightboxImage.name}
        />
      )}
    </div>
  );
}

export default App;
