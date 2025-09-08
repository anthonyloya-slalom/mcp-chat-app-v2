import React from "react";
import { colors } from "@/components/constants/colors";
import styles from "./ChartPercentageSummary.module.css";

interface ChartPercentageSummaryProps {
  items: { value: number; percent: string }[];
}

export default function ChartPercentageSummary({ items }: ChartPercentageSummaryProps) {
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