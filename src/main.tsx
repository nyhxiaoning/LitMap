import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./context/AppContext";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App";
import books from "./data/books";
import { validateBooks } from "./utils/validateData";
import "leaflet/dist/leaflet.css";
import "./styles/global.css";

// Validate book data integrity in development
if (import.meta.env.DEV) {
  validateBooks(books);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>
);
