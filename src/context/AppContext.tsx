import { useEffect, useReducer, useCallback, type ReactNode } from "react";
import type { AppAction, BookData } from "../types";
import {
  FilterContext,
  UIContext,
  type FilterState,
  type UIState,
} from "./contexts";

// ---- Initial states ----

const READING_LIST_STORAGE_KEY = "litmap-reading-list";
const CUSTOM_BOOKS_STORAGE_KEY = "litmap-custom-books";
const BOOK_URLS_STORAGE_KEY = "litmap-book-urls";
const BOOK_OVERRIDES_STORAGE_KEY = "litmap-book-overrides";

const initialFilterState: FilterState = {
  timeFilter: null,
  searchQuery: "",
  regionFilter: null,
};

const initialUIState: UIState = {
  selectedBookId: null,
  isLeftPanelOpen: true,
  isRightDrawerOpen: false,
  galleryBooks: null,
  lightboxImage: null,
  flyToRegion: null,
  areaBooks: null,
  areaLabel: null,
  readingListBookIds: readReadingList(),
  isReadingListOpen: false,
  isReadingListManagerOpen: false,
  customBooks: readCustomBooks(),
  bookUrlOverrides: readBookUrlOverrides(),
  bookOverrides: readBookOverrides(),
};

function readReadingList(): string[] {
  try {
    const stored = window.localStorage.getItem(READING_LIST_STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) && parsed.every((id): id is string => typeof id === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function readCustomBooks(): BookData[] {
  try {
    const stored = window.localStorage.getItem(CUSTOM_BOOKS_STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed as BookData[] : [];
  } catch {
    return [];
  }
}

function readBookUrlOverrides(): Record<string, string> {
  try {
    const stored = window.localStorage.getItem(BOOK_URLS_STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, string>
      : {};
  } catch {
    return {};
  }
}

function readBookOverrides(): Record<string, Partial<BookData>> {
  try {
    const stored = window.localStorage.getItem(BOOK_OVERRIDES_STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, Partial<BookData>>
      : {};
  } catch {
    return {};
  }
}

// ---- Combined reducer (single dispatch, split state) ----
// Keeps a single reducer so cross-slice logic (e.g. SELECT_BOOK opens drawer)
// stays in one place. The split only affects which consumers re-render.

function reduceFilter(state: FilterState, action: AppAction): FilterState {
  switch (action.type) {
    case "SET_TIME_FILTER":
      return { ...state, timeFilter: action.payload };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };
    case "SET_REGION_FILTER":
      return { ...state, regionFilter: action.payload };
    default:
      return state;
  }
}

function reduceUI(state: UIState, action: AppAction): UIState {
  switch (action.type) {
    case "SELECT_BOOK":
      return {
        ...state,
        selectedBookId: action.payload,
        isRightDrawerOpen: action.payload !== null,
        galleryBooks: null,
        areaBooks: null,
        areaLabel: null,
        isReadingListOpen: false,
        isReadingListManagerOpen: false,
      };
    case "TOGGLE_LEFT_PANEL":
      return { ...state, isLeftPanelOpen: !state.isLeftPanelOpen };
    case "TOGGLE_RIGHT_DRAWER":
      return { ...state, isRightDrawerOpen: !state.isRightDrawerOpen };
    case "SET_GALLERY_BOOKS":
      return { ...state, galleryBooks: action.payload };
    case "SET_LIGHTBOX_IMAGE":
      return { ...state, lightboxImage: action.payload };
    case "FLY_TO_REGION":
      return { ...state, flyToRegion: action.payload };
    case "SET_REGION_FILTER":
      // Also update flyToRegion when region filter is set
      return { ...state, flyToRegion: action.payload?.country || null };
    case "SET_AREA_BOOKS":
      return {
        ...state,
        areaBooks: action.payload?.books ?? null,
        areaLabel: action.payload?.label ?? null,
      };
    case "TOGGLE_READING_LIST_BOOK":
      return {
        ...state,
        readingListBookIds: state.readingListBookIds.includes(action.payload)
          ? state.readingListBookIds.filter((id) => id !== action.payload)
          : [...state.readingListBookIds, action.payload],
      };
    case "TOGGLE_READING_LIST":
      return { ...state, isReadingListOpen: !state.isReadingListOpen };
    case "TOGGLE_READING_LIST_MANAGER":
      return { ...state, isReadingListManagerOpen: !state.isReadingListManagerOpen };
    case "ADD_CUSTOM_BOOK":
      return { ...state, customBooks: [...state.customBooks, action.payload] };
    case "REMOVE_CUSTOM_BOOK":
      return {
        ...state,
        customBooks: state.customBooks.filter((book) => book.id !== action.payload),
        readingListBookIds: state.readingListBookIds.filter((id) => id !== action.payload),
      };
    case "SET_BOOK_URL":
      return {
        ...state,
        bookUrlOverrides: action.payload.url
          ? { ...state.bookUrlOverrides, [action.payload.bookId]: action.payload.url }
          : Object.fromEntries(Object.entries(state.bookUrlOverrides).filter(([id]) => id !== action.payload.bookId)),
      };
    case "UPDATE_CUSTOM_BOOK":
      return {
        ...state,
        customBooks: state.customBooks.map((book) => book.id === action.payload.id ? action.payload : book),
      };
    case "UPDATE_BOOK_OVERRIDE":
      return {
        ...state,
        bookOverrides: {
          ...state.bookOverrides,
          [action.payload.bookId]: {
            ...state.bookOverrides[action.payload.bookId],
            ...action.payload.patch,
          },
        },
      };
    default:
      return state;
  }
}

// ---- Provider ----

export function AppProvider({ children }: { children: ReactNode }) {
  const [filterState, filterDispatch] = useReducer(reduceFilter, initialFilterState);
  const [uiState, uiDispatch] = useReducer(reduceUI, initialUIState);

  useEffect(() => {
    window.localStorage.setItem(READING_LIST_STORAGE_KEY, JSON.stringify(uiState.readingListBookIds));
  }, [uiState.readingListBookIds]);
  useEffect(() => {
    window.localStorage.setItem(CUSTOM_BOOKS_STORAGE_KEY, JSON.stringify(uiState.customBooks));
  }, [uiState.customBooks]);
  useEffect(() => {
    window.localStorage.setItem(BOOK_URLS_STORAGE_KEY, JSON.stringify(uiState.bookUrlOverrides));
  }, [uiState.bookUrlOverrides]);
  useEffect(() => {
    window.localStorage.setItem(BOOK_OVERRIDES_STORAGE_KEY, JSON.stringify(uiState.bookOverrides));
  }, [uiState.bookOverrides]);

  // Stable single dispatch that writes to both reducers
  const dispatch = useCallback((action: AppAction) => {
    filterDispatch(action);
    uiDispatch(action);
  }, []);

  return (
    <FilterContext.Provider value={{ state: filterState, dispatch }}>
      <UIContext.Provider value={{ state: uiState, dispatch }}>
        {children}
      </UIContext.Provider>
    </FilterContext.Provider>
  );
}

// Hooks are in ./hooks.ts to keep Fast Refresh working for AppProvider
