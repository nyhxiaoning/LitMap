import { useEffect, useRef, useCallback } from "react";
import { useUIContext } from "../../context/hooks";
import styles from "./Lightbox.module.css";

interface LightboxProps {
  url: string;
  name: string;
}

export default function Lightbox({ url, name }: LightboxProps) {
  const { dispatch } = useUIContext();
  const lightboxRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    dispatch({ type: "SET_LIGHTBOX_IMAGE", payload: null });
  }, [dispatch]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // Focus trap + auto-focus close button on mount
  useEffect(() => {
    // Capture the previously focused element BEFORE we shift focus into the lightbox
    const prevFocused = document.activeElement as HTMLElement | null;

    const closeBtn = lightboxRef.current?.querySelector<HTMLElement>("button");
    closeBtn?.focus();

    // Restore focus on unmount to the element that was focused before the lightbox opened
    return () => {
      prevFocused?.focus();
    };
  }, []);

  return (
    <div
      className={styles.overlay}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={`实景图片：${name}`}
      onKeyDown={(e) => {
        // Trap focus: if Tab is pressed, cycle within the lightbox
        if (e.key === "Tab") {
          const focusable = lightboxRef.current?.querySelectorAll<HTMLElement>(
            'button, [tabindex]:not([tabindex="-1"])'
          );
          if (!focusable || focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      }}
    >
      <div
        ref={lightboxRef}
        className={`glass-strong ${styles.lightbox}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="关闭灯箱"
        >
          ×
        </button>

        <div className={styles.imageContainer}>
          <img src={url} alt={name} />
        </div>

        <div className={styles.caption}>
          <span className={styles.captionIcon}>‣</span>
          <span>{name}</span>
        </div>
      </div>
    </div>
  );
}
