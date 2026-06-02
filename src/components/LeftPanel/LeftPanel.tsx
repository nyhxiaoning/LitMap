import { useMemo, useState, memo } from "react";
import type { BookData, RegionFilter } from "../../types";
import { useAppContext } from "../../context/hooks";
import { matchesTimeFilter } from "../../utils/filterUtils";
import literaryGuide from "../../data/literaryGuide";
import type { LiteraryContinent } from "../../data/literaryGuide";
import { baseCity, REGION_COUNTRIES, REGION_NAMES } from "../../utils/regionUtils";
import { filterBySearch } from "../../utils/filterUtils";
import styles from "./LeftPanel.module.css";

// ---- Book filtering ----
function filterByRegion(books: BookData[], rf: RegionFilter): BookData[] {
  return books.filter(b => {
    if (REGION_NAMES.has(rf.country)) {
      // Multi-country region: match if book's country is in the region
      const countries = REGION_COUNTRIES.get(rf.country) || [];
      if (!countries.includes(b.country)) return false;
    } else if (b.country !== rf.country) {
      return false;
    }
    if (rf.provinceKey) {
      if (`${b.lat.toFixed(0)},${b.lng.toFixed(0)}` !== rf.provinceKey) return false;
    }
    if (rf.cityBase) {
      if (baseCity(b.city) !== rf.cityBase) return false;
    }
    if (rf.district) {
      if (b.city !== rf.district) return false;
    }
    return true;
  });
}

// ---- Search results mode ----
function SearchMode({ books }: { books: BookData[] }) {
  const { state, dispatch } = useAppContext();

  const filtered = useMemo(() => {
    let result = filterBySearch(books, state.searchQuery);
    if (state.timeFilter !== null) {
      result = result.filter((b) => matchesTimeFilter(b.sliderVal, b.tags, state.timeFilter));
    }
    // Note: regionFilter is intentionally NOT applied to search results.
    // Search is always global across all books.
    return result.sort((a, b) => a.rank - b.rank);
  }, [books, state.searchQuery, state.timeFilter]);

  return (
    <>
      <div>
        <div className={styles.header}>
          <h2>搜索结果</h2>
          <span className={styles.count}>
            <button
              onClick={() => dispatch({ type: "SET_SEARCH_QUERY", payload: "" })}
              className={styles.clearBtn}
            >
              ← 全部
            </button>
            {filtered.length} 部
          </span>
        </div>
        <div className={styles.searchHint}>
          搜索 "{state.searchQuery}" — 共匹配 {filtered.length} 部作品
        </div>
      </div>
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.emptyResult}>未找到匹配的书籍，请尝试其他关键词</div>
        ) : (
          filtered.map((b) => <BookCard key={b.id} book={b} />)
        )}
      </div>
    </>
  );
}

// ---- Book card ----
const BookCard = memo(function BookCard({ book }: { book: BookData }) {
  const { state, dispatch } = useAppContext();
  return (
    <div className={`${styles.card} ${state.selectedBookId === book.id ? styles.active : ""}`}
      onClick={() => dispatch({ type: "SELECT_BOOK", payload: book.id })}>
      <div className={styles.rank}>#{book.rank}</div>
      <div className={styles.cardCover}>
        <img src={book.coverUrl} alt={book.title} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      </div>
      <div className={styles.cardInfo}>
        <h4>{book.title}</h4>
        <span className={styles.author}>{book.author}</span>
        <div className={styles.tags}>
          {book.tags.slice(0, 2).map(tag => <span key={tag} className={styles.tag}>{tag}</span>)}
          {book.isTrajectory && <span className={styles.trajTag}>↗ 流浪</span>}
        </div>
      </div>
    </div>
  );
});

// ---- Book browse mode (when regionFilter is active) ----
function BrowseMode({ books }: { books: BookData[] }) {
  const { state, dispatch } = useAppContext();
  const rf = state.regionFilter!;

  const filtered = useMemo(() => {
    let result = books.filter(b => matchesTimeFilter(b.sliderVal, b.tags, state.timeFilter));
    if (rf) result = filterByRegion(result, rf);
    return result;
  }, [books, state.timeFilter, rf]);

  const level = rf.district ? "flat" : rf.cityBase ? "district" : rf.provinceKey ? "city" : REGION_NAMES.has(rf.country) ? "country" : "province";

  const groups = useMemo(() => {
    const g = new Map<string, BookData[]>();
    for (const b of filtered) {
      let k: string;
      if (level === "country") k = b.country;
      else if (level === "province") k = `${b.lat.toFixed(0)},${b.lng.toFixed(0)}`;
      else if (level === "city") k = baseCity(b.city);
      else if (level === "district") k = b.city;
      else k = b.id;
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(b);
    }
    for (const [, v] of g) v.sort((a, b) => a.rank - b.rank);
    if (level === "country") return new Map([...g.entries()].sort((a, b) => b[1].length - a[1].length));
    return g;
  }, [filtered, level]);

  const flatSorted = useMemo(() => [...filtered].sort((a, b) => a.rank - b.rank), [filtered]);

  const title = rf.district || rf.cityBase || rf.country || "文学图书索引";
  const breadcrumb = [rf.country, rf.cityBase || "", rf.district || ""].filter(Boolean).join(" › ");

  return (
    <>
      <div>
        <div className={styles.header}>
          <h2>{title}</h2>
          <span className={styles.count}>
            <button onClick={() => dispatch({ type: "SET_REGION_FILTER", payload: null })} className={styles.clearBtn}>← 全部</button>
            {filtered.length} 部
          </span>
        </div>
        {breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}
      </div>
      <div className={styles.list}>
        {level !== "flat" && groups ? (
          Array.from(groups.entries()).map(([key, groupBooks]) => {
            const label = level === "country" ? key : level === "province" ? (groupBooks[0].country + " · " + groupBooks.length + "部") : key;
            return (
              <div key={key} className={styles.provinceGroup}>
                <div className={styles.provinceHeader}>
                  <span className={styles.provinceName}>{label}</span>
                  <span className={styles.provinceCount}>{groupBooks.length} 部</span>
                </div>
                {groupBooks.map(b => <BookCard key={b.id} book={b} />)}
              </div>
            );
          })
        ) : (
          flatSorted.map(b => <BookCard key={b.id} book={b} />)
        )}
      </div>
    </>
  );
}

// ---- Area books mode (when a cluster is clicked on the map) ----
function AreaMode({ books, label }: { books: BookData[]; label: string }) {
  const { state, dispatch } = useAppContext();

  const filtered = useMemo(() => {
    let result = books;
    if (state.timeFilter !== null) {
      result = result.filter((b) => matchesTimeFilter(b.sliderVal, b.tags, state.timeFilter));
    }
    return result.sort((a, b) => a.rank - b.rank);
  }, [books, state.timeFilter]);

  return (
    <>
      <div>
        <div className={styles.header}>
          <h2>{label}</h2>
          <span className={styles.count}>
            <button
              onClick={() => dispatch({ type: "SET_AREA_BOOKS", payload: null })}
              className={styles.clearBtn}
            >
              ← 全部
            </button>
            {filtered.length} 部
          </span>
        </div>
      </div>
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.emptyResult}>该区域在当前时间筛选下没有匹配的书籍</div>
        ) : (
          filtered.map((b) => <BookCard key={b.id} book={b} />)
        )}
      </div>
    </>
  );
}

// ---- Literary guide overview mode ----
function OverviewMode({ onRegionClick }: { onRegionClick: (rf: RegionFilter) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["欧洲"]));

  const toggle = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  return (
    <>
      <div className={styles.header}>
        <h2>世界文学导览</h2>
        <span className={styles.count}>5 大洲 · 7 区域</span>
      </div>
      <div className={styles.list}>
        {literaryGuide.map((continent: LiteraryContinent) => (
          <div key={continent.name} className={styles.continentGroup}>
            <div className={styles.continentHeader} onClick={() => toggle(continent.name)}>
              <span className={styles.continentIcon}>{expanded.has(continent.name) ? "▼" : "▶"}</span>
              <span className={styles.continentName}>{continent.name}</span>
              <span className={styles.continentSub}>{continent.subtitle}</span>
            </div>
            {expanded.has(continent.name) && continent.regions.map(region => (
              <div
                key={region.name}
                className={styles.regionCard}
                role="button"
                tabIndex={0}
                aria-label={`查看 ${region.name} 文学`}
                onClick={() => onRegionClick({ country: region.mapRegion || region.name })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRegionClick({ country: region.mapRegion || region.name });
                  }
                }}
              >
                <div className={styles.regionName}>
                  {region.name}
                  <span className={styles.regionCountries}>{region.countries}</span>
                </div>
                <div className={styles.regionFeature}><span className={styles.regionLabel}>特点</span>{region.features}</div>
                <div className={styles.regionWorks}><span className={styles.regionLabel}>代表作</span>{region.works}</div>
                <div className={styles.regionQuote}>{region.quote}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// ---- Main ----
interface LeftPanelProps {
  books: BookData[];
  areaBooks: BookData[] | null;
  areaLabel: string | null;
}

export default function LeftPanel({ books, areaBooks, areaLabel }: LeftPanelProps) {
  const { state, dispatch } = useAppContext();

  const handleRegionClick = (rf: RegionFilter) => {
    dispatch({ type: "SET_REGION_FILTER", payload: rf });
  };

  const handleToggle = () => dispatch({ type: "TOGGLE_LEFT_PANEL" });

  return (
    <>
      <button className={`glass-strong ${styles.toggleBtn}`} onClick={handleToggle}
        style={{ left: state.isLeftPanelOpen ? "calc(var(--left-panel-width) - 14px)" : "0px" }}>
        <span>{state.isLeftPanelOpen ? "◀" : "▶"}</span>
      </button>

      <aside className={`glass ${styles.panel}`}
        style={{ transform: state.isLeftPanelOpen ? "translateX(0)" : "translateX(-420px)" }}>
        {state.searchQuery ? (
          <SearchMode books={books} />
        ) : areaBooks && areaBooks.length > 0 ? (
          <AreaMode books={areaBooks} label={areaLabel || "该地区作品"} />
        ) : state.regionFilter ? (
          <BrowseMode books={books} />
        ) : (
          <OverviewMode onRegionClick={handleRegionClick} />
        )}
      </aside>
    </>
  );
}
