import { createContext } from "react";
import type { AppAction, RegionFilter } from "../types";

// ---- State slices ----
// Split into two independent contexts so that rapid filter changes
// (typing, scrubbing timeline) don't cause UI-only consumers to re-render.

export interface FilterState {
  timeFilter: number | null;
  searchQuery: string;
  regionFilter: RegionFilter | null;
}

export interface UIState {
  selectedBookId: string | null;
  isLeftPanelOpen: boolean;
  isRightDrawerOpen: boolean;
  galleryBooks: import("../types").BookData[] | null;
  lightboxImage: { url: string; name: string } | null;
  flyToRegion: string | null;
  areaBooks: import("../types").BookData[] | null;
  areaLabel: string | null;
  readingListBookIds: string[];
  isReadingListOpen: boolean;
  isReadingListManagerOpen: boolean;
  customBooks: import("../types").BookData[];
  bookUrlOverrides: Record<string, string>;
  bookOverrides: Record<string, Partial<import("../types").BookData>>;
}

export interface FilterContextValue {
  state: FilterState;
  dispatch: React.Dispatch<AppAction>;
}

export interface UIContextValue {
  state: UIState;
  dispatch: React.Dispatch<AppAction>;
}

export const FilterContext = createContext<FilterContextValue | null>(null);
export const UIContext = createContext<UIContextValue | null>(null);
