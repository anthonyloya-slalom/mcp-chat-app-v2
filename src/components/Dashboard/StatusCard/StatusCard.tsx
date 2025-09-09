import React from "react";
import styles from "./StatusCard.module.css";

interface StatusCardProps {
  count: number;
  title: string;
  subtitle: string;
  color?: string;
}

export default function StatusCard({ count, title, subtitle, color }: StatusCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={styles.textBlock}>
          <span className={styles.count} style={{ color: color || "#7c3aed" }}>
            {count}
          </span>
          <span className={styles.title}>{title}</span>
          <span className={styles.subtitle}>{subtitle}</span>
        </div>
      </div>
    </div>
  );
}