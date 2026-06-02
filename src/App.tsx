import { useUIContext } from "./context/hooks";
import books from "./data/books";
import MapView from "./components/MapView/MapView";
import TopBar from "./components/TopBar/TopBar";
import LeftPanel from "./components/LeftPanel/LeftPanel";
import RightDrawer from "./components/RightDrawer/RightDrawer";
import BottomTimeline from "./components/BottomTimeline/BottomTimeline";
import CoverGallery from "./components/MapView/CoverGallery";
import Lightbox from "./components/Lightbox/Lightbox";
import styles from "./App.module.css";

function App() {
  const { state } = useUIContext();
  const selectedBook = state.selectedBookId
    ? books.find((b) => b.id === state.selectedBookId) ?? null
    : null;

  return (
    <div className={styles.container}>
      <MapView />

      <TopBar />

      <LeftPanel
        books={books}
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
