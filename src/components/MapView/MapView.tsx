import { useEffect, useMemo, useRef, useState, memo } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { matchesTimeFilter, matchesSearch, normalizeCity, buildCityIndex, ZOOM } from "../../utils/filterUtils";
import { useAppContext } from "../../context/hooks";
import books from "../../data/books";
import type { BookData } from "../../types";
import { EUROPE_REGIONS, europeRegion } from "../../utils/regionUtils";
import styles from "./MapView.module.css";

// ---- Boundary + flyTo Controller ----
function MapController({ selectedBook, flyToRegion, searchQuery }: {
  selectedBook: BookData | null;
  flyToRegion: string | null;
  searchQuery: string;
}) {
  const map = useMap();
  const prevId = useRef<string | null>(null);
  const prevRegion = useRef<string | null>(null);
  const prevSearchQuery = useRef<string>("");

  useEffect(() => {
    map.setMinZoom(2);
    map.setMaxZoom(18);
    map.setMaxBounds([[-85, -180], [85, 180]]);
    // eslint-disable-next-line react-hooks/immutability -- Leaflet map is mutable by design, this is the only way to set maxBoundsViscosity
    map.options.maxBoundsViscosity = 1.0;
    map.whenReady(() => map.invalidateSize());
  }, [map]);

  // Fly to selected book
  useEffect(() => {
    if (selectedBook && selectedBook.id !== prevId.current) {
      prevId.current = selectedBook.id;
      map.flyTo([selectedBook.lat, selectedBook.lng], 8, {
        duration: 0.8, easeLinearity: 0.25,
      });
    }
    if (!selectedBook) {
      prevId.current = null;
      map.flyTo([30, 15], 3, {
        duration: 0.8, easeLinearity: 0.25,
      });
    }
  }, [selectedBook, map]);

  // Fly to region when sidebar region card is clicked
  useEffect(() => {
    if (flyToRegion && flyToRegion !== prevRegion.current) {
      prevRegion.current = flyToRegion;

      // Determine which countries belong to this region
      let targetCountries: string[];
      const er = europeRegion(flyToRegion);
      if (er) {
        targetCountries = Object.entries(EUROPE_REGIONS).filter(([, r]) => r === er).map(([c]) => c);
      } else if (flyToRegion === "非洲") {
        targetCountries = ["尼日利亚", "南非", "加纳"];
      } else if (flyToRegion === "大洋洲") {
        targetCountries = ["澳大利亚", "新西兰"];
      } else {
        targetCountries = [flyToRegion];
      }

      const regionBooks = books.filter(b => targetCountries.includes(b.country));
      if (regionBooks.length > 0) {
        const lats = regionBooks.map(b => b.lat);
        const lngs = regionBooks.map(b => b.lng);
        const bounds = L.latLngBounds(
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)]
        );
        map.flyToBounds(bounds.pad(0.3), { duration: 0.8, easeLinearity: 0.25 });
      }
    }
  }, [flyToRegion, map]);

  // Fly to search results when query changes
  useEffect(() => {
    if (searchQuery && searchQuery !== prevSearchQuery.current) {
      prevSearchQuery.current = searchQuery;
      const results = books.filter((b) => matchesSearch(b, searchQuery));
      if (results.length > 0) {
        const lats = results.map(b => b.lat);
        const lngs = results.map(b => b.lng);
        const bounds = L.latLngBounds(
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)]
        );
        map.flyToBounds(bounds.pad(0.15), { duration: 0.6, easeLinearity: 0.25 });
      }
    }
    if (!searchQuery) {
      prevSearchQuery.current = "";
    }
  }, [searchQuery, map]);

  return null;
}

// ---- City index helpers ----
// Cached index for the full book list — stable across renders since the
// source data never changes. Used by drill-down click handlers to
// avoid rebuilding the full index on every click.
let _fullCityIndex: Map<string, string> | null = null;
function getFullCityIndex(): Map<string, string> {
  if (!_fullCityIndex) _fullCityIndex = buildCityIndex(books);
  return _fullCityIndex;
}

// ---- 6-level hierarchical clustering ----
// L1 (zoom < ZOOM.CONTINENT):    欧洲次区域 + 非欧洲国家
// L2 (ZOOM.CONTINENT – ZOOM.COUNTRY):  国家（欧洲拆分到各国）
// L3 (ZOOM.COUNTRY – ZOOM.PROVINCE): 省份/地区 — 2° grid
// L4 (ZOOM.PROVINCE – ZOOM.CITY): 城市 — base city name
// L5 (ZOOM.CITY – ZOOM.DISTRICT): 城区 — original city field
// L6 (zoom >= ZOOM.DISTRICT):  精确位置 — exact coordinates
function groupByZoom(bookList: BookData[], zoom: number): Map<string, BookData[]> {
  const cityIndex = buildCityIndex(bookList);
  const groups = new Map<string, BookData[]>();
  for (const book of bookList) {
    let key: string;
    const cityBase = cityIndex.get(normalizeCity(book.city)) || normalizeCity(book.city);
    const er = europeRegion(book.country);

    if (zoom < ZOOM.CONTINENT) {
      key = er || book.country || "";
    } else if (zoom < ZOOM.COUNTRY) {
      key = book.country || "";
    } else if (zoom < ZOOM.PROVINCE) {
      key = `${book.country}｜${book.lat.toFixed(0)},${book.lng.toFixed(0)}`;
    } else if (zoom < ZOOM.CITY) {
      key = `${book.country}｜${cityBase}`;
    } else if (zoom < ZOOM.DISTRICT) {
      key = `${book.country}｜${book.city}`;
    } else {
      key = `${book.lat.toFixed(4)},${book.lng.toFixed(4)}`;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(book);
  }
  for (const [, g] of groups) {
    g.sort((a, b) => a.rank - b.rank);
  }
  return groups;
}

/** Pick a representative lat/lng for a group */
function groupCenter(bookList: BookData[]): [number, number] {
  const avgLat = bookList.reduce((s, b) => s + b.lat, 0) / bookList.length;
  const avgLng = bookList.reduce((s, b) => s + b.lng, 0) / bookList.length;
  return [avgLat, avgLng];
}

/** Label for a grouped marker */
function groupLabel(bookList: BookData[], zoom: number, cityIndex: Map<string, string>): string {
  const top = bookList[0];
  if (bookList.length === 1) return top.title;
  if (zoom < ZOOM.CONTINENT) {
    const er = europeRegion(top.country);
    return er ? `${er} · ${bookList.length}本` : (top.country || "");
  }
  if (zoom < ZOOM.COUNTRY)  return `${top.country} · ${bookList.length}本`;
  if (zoom < ZOOM.PROVINCE)  return `${top.country} · ${bookList.length}本`;
  if (zoom < ZOOM.CITY)      return `${cityIndex.get(normalizeCity(top.city)) || normalizeCity(top.city)} · ${bookList.length}本`;
  if (zoom < ZOOM.DISTRICT)  return `${top.city} · ${bookList.length}本`;
  return `${bookList.length} 本`;
}

// ---- Book cover icon ----
function createBookIcon(books: BookData[], label: string): L.DivIcon {
  const sorted = [...books].sort((a, b) => a.rank - b.rank);
  const topBook = sorted[0];
  const count = sorted.length;

  if (count === 1) {
    // Single book: show cover + title
    const size = 48;
    const imgW = 44;
    const imgH = 60;
    const displayLabel = topBook.title.length > 10 ? topBook.title.slice(0, 9) + "…" : topBook.title;
    const ariaLabel = `${topBook.title} — ${topBook.author}`;
    const html = `
      <div style="position:relative;width:${size}px;height:${size+16}px;cursor:pointer;transition:transform 0.25s cubic-bezier(0.25,1.1,0.5,1.1);"
        tabindex="0" role="button" aria-label="${ariaLabel}"
        onmouseenter="this.style.transform='scale(1.1)'" onmouseleave="this.style.transform='scale(1)'">
        <div style="width:${imgW}px;height:${imgH}px;border-radius:4px;overflow:hidden;
          box-shadow:0 3px 14px rgba(91,140,133,0.2),0 0 0 1px rgba(91,140,133,0.06);
          border:2px solid #fafcfb;
          transition:transform 0.25s cubic-bezier(0.25,1.1,0.5,1.1);">
          <img src="${topBook.coverUrl}" alt="${topBook.title}" style="width:100%;height:100%;object-fit:cover;"
            onerror="this.style.display='none'" />
        </div>
        <div style="margin-top:4px;text-align:center;font-size:10px;font-weight:600;
          color:#1a2624;max-width:${size}px;overflow:hidden;text-overflow:ellipsis;
          white-space:nowrap;text-shadow:0 1px 2px rgba(255,255,255,0.7);">${displayLabel}</div>
      </div>`;
    return L.divIcon({
      className: styles.coverMarker,
      html,
      iconSize: [size, size + 16],
      iconAnchor: [size / 2, size + 16],
      popupAnchor: [0, -(size + 16)],
    });
  }

  // Stack: multiple books — top cover + title + count badge + location label
  const size = 56;
  const imgW = 48;
  const imgH = 66;
  const topTitle = topBook.title.length > 8 ? topBook.title.slice(0, 7) + "…" : topBook.title;
  const displayLabel = label.length > 12 ? label.slice(0, 11) + "…" : label;
  const ariaLabel = `${label} — ${count} 部作品`;
  const html = `
    <div style="position:relative;width:${size}px;height:${size+44}px;cursor:pointer;transition:transform 0.25s cubic-bezier(0.25,1.1,0.5,1.1);"
      tabindex="0" role="button" aria-label="${ariaLabel}"
      onmouseenter="this.style.transform='scale(1.1)'" onmouseleave="this.style.transform='scale(1)'">
      <div style="position:absolute;top:0;left:4px;width:${imgW}px;height:${imgH}px;
        border-radius:4px;overflow:hidden;box-shadow:0 2px 10px rgba(91,140,133,0.2);
        border:2px solid #fafcfb;transform:rotate(-3deg);">
        <img src="${topBook.coverUrl}" alt="${topBook.title}" style="width:100%;height:100%;object-fit:cover;"
          onerror="this.style.display='none'" />
      </div>
      <div style="position:absolute;top:2px;left:0;width:${imgW}px;height:${imgH}px;
        border-radius:4px;overflow:hidden;box-shadow:0 2px 10px rgba(91,140,133,0.2);
        border:2px solid #fafcfb;transform:rotate(2deg);">
        <img src="${topBook.coverUrl}" alt="${topBook.title}" style="width:100%;height:100%;object-fit:cover;"
          onerror="this.style.display='none'" />
      </div>
      <span style="position:absolute;top:-5px;right:-2px;background:#5b8c85;color:white;
        font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;
        z-index:10;box-shadow:0 2px 6px rgba(91,140,133,0.4);">${count}</span>
      <div style="margin-top:70px;text-align:center;font-size:10px;font-weight:700;
        color:#1a2624;max-width:${size}px;overflow:hidden;text-overflow:ellipsis;
        white-space:nowrap;text-shadow:0 1px 2px rgba(255,255,255,0.7);">${topTitle}</div>
      <div style="margin-top:2px;text-align:center;font-size:9px;font-weight:500;
        color:#5b8c85;max-width:${size}px;overflow:hidden;text-overflow:ellipsis;
        white-space:nowrap;text-shadow:0 1px 2px rgba(255,255,255,0.7);">${displayLabel}</div>
    </div>`;
  return L.divIcon({
    className: styles.coverMarker,
    html,
    iconSize: [size, size + 44],
    iconAnchor: [size / 2, size + 44],
    popupAnchor: [0, -(size + 44)],
  });
}

// ---- Book Marker (with drill-down) ----
const BookMarker = memo(function BookMarker({ lat, lng, locationBooks, groupLabel, zoom }: {
  lat: number; lng: number; locationBooks: BookData[]; groupLabel: string; zoom: number;
}) {
  const { dispatch } = useAppContext();
  const map = useMap();
  const sorted = useMemo(
    () => [...locationBooks].sort((a, b) => a.rank - b.rank),
    [locationBooks]
  );
  const icon = useMemo(() => createBookIcon(sorted, groupLabel), [sorted, groupLabel]);

  const handleClick = () => {
    if (zoom >= ZOOM.DISTRICT) {
      // L6 (finest): select single book or show gallery for small exact-location clusters
      if (sorted.length === 1) {
        dispatch({ type: "SELECT_BOOK", payload: sorted[0].id });
      } else {
        dispatch({ type: "SET_GALLERY_BOOKS", payload: sorted });
      }
    } else {
      // L1-L5 (cluster): drill down — fly to bounds of this group
      const lats = sorted.map(b => b.lat);
      const lngs = sorted.map(b => b.lng);
      const bounds = L.latLngBounds(
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      );
      map.flyToBounds(bounds.pad(0.3), { duration: 0.6, easeLinearity: 0.25 });

      const country = sorted[0].country;
      const er = europeRegion(country);
      const pk = `${sorted[0].lat.toFixed(0)},${sorted[0].lng.toFixed(0)}`;
      const cb = getFullCityIndex().get(normalizeCity(sorted[0].city)) || normalizeCity(sorted[0].city);

      if (zoom < ZOOM.CONTINENT) {
        dispatch({ type: "SET_REGION_FILTER", payload: { country: er || country } });
      } else if (zoom < ZOOM.COUNTRY) {
        dispatch({ type: "SET_REGION_FILTER", payload: { country } });
      } else if (zoom < ZOOM.PROVINCE) {
        dispatch({ type: "SET_REGION_FILTER", payload: { country, provinceKey: pk } });
      } else if (zoom < ZOOM.CITY) {
        dispatch({ type: "SET_REGION_FILTER", payload: { country, provinceKey: pk, cityBase: cb } });
      } else {
        dispatch({ type: "SET_REGION_FILTER", payload: { country, provinceKey: pk, cityBase: cb, district: sorted[0].city } });
      }
    }
  };

  const handleKeyDown = (e: L.LeafletKeyboardEvent) => {
    if (e.originalEvent.key === "Enter" || e.originalEvent.key === " ") {
      e.originalEvent.preventDefault();
      handleClick();
    }
  };

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      keyboard={true}
      eventHandlers={{ click: handleClick, keydown: handleKeyDown }}
    />
  );
});

// ---- Trajectory route (only for selected book) ----
const TrajectoryRoute = memo(function TrajectoryRoute({ book }: {
  book: BookData;
}) {
  if (!book.path) return null;
  const positions: [number, number][] = book.path.map((p) => p.coord);

  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{
          color: book.color,
          weight: 2.5,
          dashArray: "8 5",
          opacity: 0.75,
        }}
      />
      {book.path.map((node, idx) => (
        <Marker
          key={idx}
          position={node.coord}
          icon={L.divIcon({
            className: styles.routeDot,
            html: `<div style="width:8px;height:8px;border-radius:50%;
              background:${book.color};border:2px solid white;
              box-shadow:0 1px 4px rgba(91,140,133,0.25);transition:transform 0.2s ease;"
              onmouseenter="this.style.transform='scale(1.5)'" onmouseleave="this.style.transform='scale(1)'"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          })}
        >
          <Popup>
            <div className={styles.routePopup}>
              <strong>{node.name}</strong>
              <span className={styles.routeYear}>{node.year}</span>
              <p>{node.info}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
});

// ---- Zoom tracking component (debounced) ----
const ZOOM_DEBOUNCE_MS = 180;
function ZoomTracker({ onChange }: { onChange: (z: number) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep onChangeRef in sync with latest callback — must be in an effect, not during render
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const map = useMapEvents({
    zoomend: (e) => {
      const z = e.target.getZoom();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChangeRef.current(z), ZOOM_DEBOUNCE_MS);
    },
  });

  // Capture initial zoom on mount (immediate — no need for debounce on first paint)
  useEffect(() => { onChange(map.getZoom()); }, [map, onChange]);

  // Cleanup
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return null;
}

// ---- Main MapView ----
export default function MapView() {
  const { state } = useAppContext();
  const [mapZoom, setMapZoom] = useState(3);

  const filteredBooks = useMemo(() => {
    return books.filter((b) =>
      matchesTimeFilter(b.sliderVal, b.tags, state.timeFilter) &&
      matchesSearch(b, state.searchQuery)
    );
  }, [state.timeFilter, state.searchQuery]);

  const locationGroups = useMemo(
    () => groupByZoom(filteredBooks, mapZoom),
    [filteredBooks, mapZoom]
  );

  const selectedBook = state.selectedBookId
    ? books.find((b) => b.id === state.selectedBookId) ?? null
    : null;

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        center={[30, 15]}
        zoom={3}
        className={styles.map}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <ZoomTracker onChange={setMapZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
          updateWhenZooming={false}
          keepBuffer={4}
        />

        <MapController selectedBook={selectedBook} flyToRegion={state.flyToRegion} searchQuery={state.searchQuery} />

        {(() => {
          const cityIndex = buildCityIndex(filteredBooks);
          return Array.from(locationGroups.entries()).map(([key, locationBooks]) => {
            const [lat, lng] = groupCenter(locationBooks);
            const label = groupLabel(locationBooks, mapZoom, cityIndex);
            return (
              <BookMarker
                key={key}
                lat={lat}
                lng={lng}
                locationBooks={locationBooks}
                groupLabel={label}
                zoom={mapZoom}
              />
            );
          });
        })()}

        {selectedBook?.isTrajectory && selectedBook.path && (
          <TrajectoryRoute book={selectedBook} />
        )}
      </MapContainer>
    </div>
  );
}
