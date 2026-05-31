import { useContext } from "react";
import { FilterContext, UIContext } from "./contexts";
import type { AppState } from "../types";

export { type AppState };

export function useFilterContext() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilterContext must be used within AppProvider");
  return ctx;
}

export function useUIContext() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUIContext must be used within AppProvider");
  return ctx;
}

/**
 * Legacy hook — use when a component genuinely needs both slices.
 * Prefer useFilterContext() or useUIContext() when possible.
 */
export function useAppContext() {
  const filterCtx = useContext(FilterContext);
  const uiCtx = useContext(UIContext);
  if (!filterCtx || !uiCtx) throw new Error("useAppContext must be used within AppProvider");

  return {
    state: {
      ...filterCtx.state,
      ...uiCtx.state,
    } as AppState,
    dispatch: filterCtx.dispatch,
  };
}
