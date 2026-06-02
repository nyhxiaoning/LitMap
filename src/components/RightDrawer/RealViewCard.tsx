import { memo } from "react";
import { useUIContext } from "../../context/hooks";
import styles from "./RightDrawer.module.css";

interface RealViewCardProps {
  url?: string;
  name: string;
  quote?: string;
}

export default memo(function RealViewCard({ url, name, quote }: RealViewCardProps) {
  const { dispatch } = useUIContext();

  const handleClick = () => {
    if (!url) return;
    dispatch({
      type: "SET_LIGHTBOX_IMAGE",
      payload: { url, name },
    });
  };

  return (
    <div
      className={styles.realViewCard}
      onClick={handleClick}
      style={{ cursor: url ? "pointer" : "default" }}
    >
      {url && (
        <div className={styles.realViewMask}>
          <img src={url} alt={name} loading="lazy" />
          <div className={styles.maskOverlay} />
        </div>
      )}
      <div className={styles.realViewInfo}>
        <span className={styles.realViewIcon}>🏛️</span>
        <span>{name}</span>
        {url && <span className={styles.clickHint}>点击查看全景 →</span>}
      </div>
      {quote && (
        <div className={styles.realViewQuote}>
          <span className={styles.quoteMark}>"</span>
          {quote}
          <span className={styles.quoteMark}>"</span>
        </div>
      )}
    </div>
  );
});
