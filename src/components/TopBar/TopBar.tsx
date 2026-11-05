import { useFilterContext, useUIContext } from "@/context/hooks";
import styles from "./TopBar.module.css";

export default function TopBar() {
  const { state, dispatch } = useFilterContext();
  const { state: uiState } = useUIContext();

  return (
    <div className={`glass ${styles.topBar}`}>
      {/* Left: brand */}
      <div className={styles.brand}>
        <h1 className={styles.logo}>LitMap</h1>
        <span className={styles.slogan}>
          "语言的边界就是世界的边界" <span className={styles.sloganAuthor}>— 维特根斯坦</span>
        </span>
      </div>

      {/* Center: search */}
      <div className={styles.searchBox}>
        <svg
          className={styles.searchIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="搜索书籍、作者或地点..."
          className={styles.searchInput}
          value={state.searchQuery}
          onChange={(e) => dispatch({ type: "SET_SEARCH_QUERY", payload: e.target.value })}
          aria-label="搜索书籍、作者或地点"
        />
        {state.searchQuery && (
          <button
            className={styles.clearBtn}
            onClick={() => dispatch({ type: "SET_SEARCH_QUERY", payload: "" })}
            aria-label="清除搜索"
          >
            ✕
          </button>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.listBtn} ${uiState.isReadingListOpen ? styles.listBtnActive : ""}`}
          onClick={() => dispatch({ type: "TOGGLE_READING_LIST" })}
          aria-expanded={uiState.isReadingListOpen}
        >
          <span aria-hidden="true">♡</span>
          <span>我的书单</span>
          <strong>{uiState.readingListBookIds.length}</strong>
        </button>
        <button
          type="button"
          className={styles.manageBtn}
          onClick={() => dispatch({ type: "TOGGLE_READING_LIST_MANAGER" })}
          aria-expanded={uiState.isReadingListManagerOpen}
        >
          管理
        </button>
      </div>
    </div>
  );
}
