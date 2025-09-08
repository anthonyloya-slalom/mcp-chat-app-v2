import React from "react";
import styles from "./ChartPercentageSummary.module.css";

interface ChartPercentageSummaryProps {
  items: { value: number; percent: string }[];
  colors: string[];
}

export default function ChartPercentageSummary({ items, colors }: ChartPercentageSummaryProps) {
  return (
    <div className={styles.leaveByStageSummaryNode}>
      <div className={styles.leaveByStageDivider} />
      <div className={styles.leaveByStagePercentRow}>
        {items.map((item, idx) => (
          <span key={idx} className={styles.leaveByStagePercentItem}>
            <span
              className={styles.leaveByStagePercent}
              style={{ color: colors[idx] }}
            >
              {item.value} ({item.percent}%)
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}