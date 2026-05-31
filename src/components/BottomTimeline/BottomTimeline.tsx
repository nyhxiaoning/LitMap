import { useMemo } from "react";
import { useFilterContext } from "../../context/hooks";
import books from "../../data/books";
import {
  CENTURY_SLIDER_20TH,
  CENTURY_SLIDER_21ST,
  SUB_ERA_20TH_MIN,
  SUB_ERA_20TH_MAX,
  SUB_ERA_21ST_MIN,
  SUB_ERA_21ST_MAX,
  SUB_20TH,
  SUB_21ST,
  extractPubYear,
} from "../../utils/filterUtils";
import styles from "./BottomTimeline.module.css";

// ---- Century tick definitions ----
const CENTURY_TICKS = [
  { value: 0, label: "公元前" },
  { value: 1, label: "中世纪" },
  { value: 2, label: "16世纪" },
  { value: 3, label: "17世纪" },
  { value: 4, label: "18世纪" },
  { value: 5, label: "19世纪" },
  { value: CENTURY_SLIDER_20TH, label: "20世纪" },
  { value: CENTURY_SLIDER_21ST, label: "21世纪" },
];

// ---- Component ----

export default function BottomTimeline() {
  const { state, dispatch } = useFilterContext();

  const tf = state.timeFilter;

  // Is the timeline in "expanded" mode?
  const isExpanded20th = tf !== null && (tf === CENTURY_SLIDER_20TH || (tf >= SUB_ERA_20TH_MIN && tf <= SUB_ERA_20TH_MAX));
  const isExpanded21st = tf !== null && (tf === CENTURY_SLIDER_21ST || (tf >= SUB_ERA_21ST_MIN && tf <= SUB_ERA_21ST_MAX));
  const isExpanded = isExpanded20th || isExpanded21st;

  // ---- Build combined tick list ----
  const ticks = useMemo(() => {
    if (!isExpanded) {
      // Default: just the 8 century ticks
      return CENTURY_TICKS.map((t) => ({
        ...t,
        type: "century" as const,
      }));
    }

    if (isExpanded20th) {
      // 20世纪 expanded: centuries 0-5 compressed + 20-year sub-ticks
      const compressed = CENTURY_TICKS.slice(0, 6).map((t) => ({
        ...t,
        type: "century" as const,
        compressed: true,
      }));
      const expanded = SUB_20TH.map((s) => ({
        value: s.value,
        label: s.label,
        type: "sub" as const,
      }));
      // Add the 21世纪 tick at the end
      return [...compressed, ...expanded, { ...CENTURY_TICKS[7], type: "century" as const }];
    }

    // 21世纪 expanded
    const compressed = CENTURY_TICKS.slice(0, 7).map((t) => ({
      ...t,
      type: "century" as const,
      compressed: true,
    }));
    const expanded = SUB_21ST.map((s) => ({
      value: s.value,
      label: s.label,
      type: "sub" as const,
    }));
    return [...compressed, ...expanded];
  }, [isExpanded, isExpanded20th]);

  // ---- Book counts per tick ----
  const tickCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const t of ticks) counts[t.value] = 0;

    for (const b of books) {
      if (ticks.some((t) => t.value === b.sliderVal)) {
        counts[b.sliderVal] = (counts[b.sliderVal] || 0) + 1;
      }
      // Sub-era counts (only count books with a precise publish year)
      if (isExpanded20th && b.sliderVal === CENTURY_SLIDER_20TH) {
        const pubYear = extractPubYear(b.tags);
        if (pubYear) {
          for (const sub of SUB_20TH) {
            if (pubYear >= sub.range[0] && pubYear <= sub.range[1]) {
              counts[sub.value] = (counts[sub.value] || 0) + 1;
              break;
            }
          }
        }
      }
      if (isExpanded21st && b.sliderVal === CENTURY_SLIDER_21ST) {
        const pubYear = extractPubYear(b.tags);
        if (pubYear) {
          for (const sub of SUB_21ST) {
            if (pubYear >= sub.range[0] && pubYear <= sub.range[1]) {
              counts[sub.value] = (counts[sub.value] || 0) + 1;
              break;
            }
          }
        }
      }
    }
    return counts;
  }, [ticks, isExpanded20th, isExpanded21st]);

  // ---- Slider range ----
  const sliderMax = ticks.length - 1;
  // When no filter is active, position the thumb in the middle of the track
  const neutralPos = Math.floor(sliderMax / 2);
  const sliderValue = useMemo(() => {
    if (tf === null) return neutralPos;
    const idx = ticks.findIndex((t) => t.value === tf);
    return idx >= 0 ? idx : ticks.findIndex((t) => t.value === (tf >= SUB_ERA_20TH_MIN ? Math.floor(tf / 10) * 10 : tf));
  }, [tf, ticks, neutralPos]);

  // ---- Handlers ----
  const handleAllEras = () => {
    dispatch({ type: "SET_TIME_FILTER", payload: null });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    const tick = ticks[idx];
    if (tick) {
      dispatch({ type: "SET_TIME_FILTER", payload: tick.value });
    }
  };

  const handleTickClick = (tickValue: number) => {
    // Toggle: if already selected, collapse back to century level
    if (tf === tickValue) {
      if (tickValue >= SUB_ERA_20TH_MIN) {
        // Sub-era → go back to century
        dispatch({ type: "SET_TIME_FILTER", payload: isExpanded20th ? CENTURY_SLIDER_20TH : CENTURY_SLIDER_21ST });
      } else if (tickValue === CENTURY_SLIDER_20TH || tickValue === CENTURY_SLIDER_21ST) {
        // Century → if already expanded, collapse to null
        dispatch({ type: "SET_TIME_FILTER", payload: null });
      } else {
        dispatch({ type: "SET_TIME_FILTER", payload: null });
      }
    } else {
      dispatch({ type: "SET_TIME_FILTER", payload: tickValue });
    }
  };

  // ---- Total count ----
  const totalCount = books.length;

  return (
    <div className={`glass-strong ${styles.timeline}`}>
      {/* "全部年代" toggle */}
      <button
        className={`${styles.allBtn} ${tf === null ? styles.allActive : ""}`}
        onClick={handleAllEras}
      >
        全部年代
        <span className={styles.allCount}>{totalCount}</span>
      </button>

      {/* Slider */}
      <div className={`${styles.sliderGroup} ${isExpanded ? styles.sliderGroupExpanded : ""}`}>
        <input
          type="range"
          min={0}
          max={sliderMax}
          value={sliderValue}
          onChange={handleSliderChange}
          className={`${styles.range} ${tf === null ? styles.rangeInactive : ""}`}
          aria-label="时间轴筛选"
          aria-valuetext={tf === null ? "全部年代" : ticks[sliderValue]?.label ?? ""}
        />
        {/* Ticks */}
        <div className={`${styles.ticks} ${isExpanded ? styles.ticksExpanded : ""}`}>
          {ticks.map((tick) => {
            const isActive = tf === tick.value;
            const isCompressed = "compressed" in tick && tick.compressed;
            const isSub = tick.type === "sub";
            return (
              <div
                key={tick.value}
                className={`${styles.tick} ${isActive ? styles.tickActive : ""} ${
                  isCompressed ? styles.tickCompressed : ""
                } ${isSub ? styles.tickSub : ""}`}
                onClick={() => handleTickClick(tick.value)}
              >
                <span className={styles.tickLabel}>{tick.label}</span>
                <span className={styles.tickCount}>{tickCounts[tick.value] ?? 0}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
