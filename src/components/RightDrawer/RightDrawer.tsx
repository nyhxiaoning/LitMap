import type { BookData } from "../../types";
import { useUIContext } from "../../context/hooks";
import RealViewCard from "./RealViewCard";
import styles from "./RightDrawer.module.css";

interface RightDrawerProps {
  book: BookData | null;
}

export default function RightDrawer({ book }: RightDrawerProps) {
  const { state, dispatch } = useUIContext();

  const handleToggle = () => {
    dispatch({ type: "TOGGLE_RIGHT_DRAWER" });
  };

  const handleClose = () => {
    dispatch({ type: "SELECT_BOOK", payload: null });
  };

  return (
    <>
      {/* Toggle button */}
      <button
        className={`glass-strong ${styles.toggleBtn}`}
        onClick={handleToggle}
        style={{
          right: state.isRightDrawerOpen
            ? "calc(var(--right-drawer-width) - 14px)"
            : "0px",
        }}
      >
        <span>{state.isRightDrawerOpen ? "▶" : "◀"}</span>
      </button>

      {/* Drawer */}
      <aside
        className={`glass ${styles.drawer}`}
        style={{
          transform: state.isRightDrawerOpen
            ? "translateX(0)"
            : "translateX(100%)",
        }}
      >
        {!book ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🗺️</span>
            <p>点击地图上的书籍<br />或左侧列表中的书名<br />以查看详细信息</p>
          </div>
        ) : (
          <>
            {/* Color header bar */}
            <div
              className={styles.colorBar}
              style={{ background: book.color }}
            />

            <div className={styles.scrollArea}>
              {/* Header */}
              <div className={styles.drawerHeader}>
                <button className={styles.closeBtn} onClick={handleClose}>
                  ×
                </button>
                <div className={styles.headerCover}>
                  <img src={book.coverUrl} alt={book.title} loading="lazy" onError={(e) => { const el = e.target as HTMLImageElement; el.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" fill="%23f5f2ed"><rect width="100" height="150" rx="4"/><text x="50" y="80" text-anchor="middle" fill="%23999" font-size="12">No Cover</text></svg>'; }} />
                </div>
                <h2>{book.title}</h2>
                <span className={styles.author}>{book.author}</span>
                <div className={styles.tags}>
                  {book.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <span className={styles.century}>{book.century}</span>
              </div>

              {/* Quote */}
              <div className={styles.quoteBlock}>
                <span className={styles.quoteMark}>"</span>
                <p>{book.quote}</p>
              </div>

              {/* Description */}
              <div className={styles.section}>
                <h3>内容简介</h3>
                <p className={styles.desc}>{book.desc}</p>
              </div>

              {/* Trajectory path - always visible */}
              {book.isTrajectory && book.path && (
                <div className={styles.section}>
                  <h3>流浪路线</h3>
                  <div className={styles.pathList}>
                    {book.path.map((node, idx) => (
                      <div key={idx} className={styles.pathNode}>
                        <div
                          className={styles.pathDot}
                          style={{ background: book.color }}
                        />
                        <div className={styles.pathInfo}>
                          <span className={styles.pathName}>{node.name}</span>
                          <span className={styles.pathYear}>
                            {node.year}
                          </span>
                          <p>{node.info}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real view pilgrimage card */}
              {book.realViewName && (
                <div className={styles.section}>
                  <h3>圣地巡礼</h3>
                  <RealViewCard
                    url={book.realViewUrl || undefined}
                    name={book.realViewName || book.city}
                    quote={book.realViewQuote || undefined}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}