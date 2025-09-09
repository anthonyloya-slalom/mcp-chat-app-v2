import React from "react";
import { percentageSummaryColors } from "@/components/constants/colors";
import styles from "./PercentageSummary.module.css";

interface PercentageSummaryProps {
  items: { value: number; percent: string }[];
}

export default function PercentageSummary({ items }: PercentageSummaryProps) {
  return (
    <div className={styles.leaveByStageSummaryNode}>
      <div className={styles.leaveByStageDivider} />
      <div className={styles.leaveByStagePercentRow}>
        {items.map((item, idx) => (
          <span key={idx} className={styles.leaveByStagePercentItem}>
            <span
              className={styles.leaveByStagePercent}
              style={{ color: percentageSummaryColors[idx] }}
            >
              {item.value} ({item.percent}%)
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}