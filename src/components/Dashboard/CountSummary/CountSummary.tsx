import React from "react";
import styles from "./CountSummary.module.css";

interface CountSummaryItem {
  label: string;
  value: number;
}

interface CountSummaryProps {
  items: CountSummaryItem[];
}

export function CountSummary({ items }: CountSummaryProps) {
  return (
    <div className={styles.countSummaryRow}>
      {items.map((item, idx) => (
        <React.Fragment key={item.label}>
          {idx > 0 && (
            <span className={styles.countSummaryDivider} />
          )}
          <span className={styles.countSummaryItem}>
            <span className={styles.countSummaryValue}>{item.value}</span>
            <span className={styles.countSummaryLabel}>{item.label}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}