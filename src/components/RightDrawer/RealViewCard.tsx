import { memo } from "react";
import { useUIContext } from "../../context/hooks";
import styles from "./RightDrawer.module.css";

interface RealViewCardProps {
  url: string;
  name: string;
}

export default memo(function RealViewCard({ url, name }: RealViewCardProps) {
  const { dispatch } = useUIContext();

  const handleClick = () => {
    dispatch({
      type: "SET_LIGHTBOX_IMAGE",
      payload: { url, name },
    });
  };

  return (
    <div className={styles.realViewCard} onClick={handleClick}>
      <div className={styles.realViewMask}>
        <img src={url} alt={name} loading="lazy" />
        <div className={styles.maskOverlay} />
      </div>
      <div className={styles.realViewInfo}>
        <span className={styles.realViewIcon}>🏛️</span>
        <span>{name}</span>
        <span className={styles.clickHint}>点击查看全景 →</span>
      </div>
    </div>
  );
});
