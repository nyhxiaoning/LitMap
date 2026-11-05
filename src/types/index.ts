// BookData interface per PRD Section 5
export interface PathNode {
  name: string;
  coord: [number, number];
  year: string;
  info: string;
}

export interface BookData {
  rank: number;
  id: string;
  sliderVal: number;
  century: string;
  lat: number;
  lng: number;
  country: string;
  city: string;
  title: string;
  author: string;
  color: string;
  coverUrl: string;
  tags: string[];
  quote: string;
  desc: string;
  isTrajectory?: boolean;
  realViewName: string;
  realViewUrl: string;
  realViewQuote: string;
  url?: string;
  path?: PathNode[];
}

export interface RegionFilter {
  country: string;
  /** 2° grid key for province level */
  provinceKey?: string;
  /** base city name for city level */
  cityBase?: string;
  /** full city field for district level */
  district?: string;
}

export interface AppState {
  selectedBookId: string | null;
  timeFilter: number | null;
  isLeftPanelOpen: boolean;
  isRightDrawerOpen: boolean;
  galleryBooks: BookData[] | null;
  lightboxImage: { url: string; name: string } | null;
  regionFilter: RegionFilter | null;
  flyToRegion: string | null; // trigger map fly-to by country/region name
  searchQuery: string;
  areaBooks: BookData[] | null; // books in currently selected cluster/area
  areaLabel: string | null; // display label for the area
  readingListBookIds: string[];
  isReadingListOpen: boolean;
  isReadingListManagerOpen: boolean;
  customBooks: BookData[];
  bookUrlOverrides: Record<string, string>;
  bookOverrides: Record<string, Partial<BookData>>;
}

export type AppAction =
  | { type: "SELECT_BOOK"; payload: string | null }
  | { type: "SET_TIME_FILTER"; payload: number | null }
  | { type: "TOGGLE_LEFT_PANEL" }
  | { type: "TOGGLE_RIGHT_DRAWER" }
  | { type: "SET_GALLERY_BOOKS"; payload: BookData[] | null }
  | { type: "SET_LIGHTBOX_IMAGE"; payload: { url: string; name: string } | null }
  | { type: "SET_REGION_FILTER"; payload: RegionFilter | null }
  | { type: "FLY_TO_REGION"; payload: string | null }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_AREA_BOOKS"; payload: { books: BookData[]; label: string } | null }
  | { type: "TOGGLE_READING_LIST_BOOK"; payload: string }
  | { type: "TOGGLE_READING_LIST" }
  | { type: "TOGGLE_READING_LIST_MANAGER" }
  | { type: "ADD_CUSTOM_BOOK"; payload: BookData }
  | { type: "REMOVE_CUSTOM_BOOK"; payload: string }
  | { type: "SET_BOOK_URL"; payload: { bookId: string; url: string } }
  | { type: "UPDATE_CUSTOM_BOOK"; payload: BookData }
  | { type: "UPDATE_BOOK_OVERRIDE"; payload: { bookId: string; patch: Partial<BookData> } };
