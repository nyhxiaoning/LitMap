import { useReducer, useCallback, type ReactNode } from "react";
import type { AppAction } from "../types";
import {
  FilterContext,
  UIContext,
  type FilterState,
  type UIState,
} from "./contexts";

// ---- Initial states ----

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
};

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
    default:
      return state;
  }
}

// ---- Provider ----

export function AppProvider({ children }: { children: ReactNode }) {
  const [filterState, filterDispatch] = useReducer(reduceFilter, initialFilterState);
  const [uiState, uiDispatch] = useReducer(reduceUI, initialUIState);

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
