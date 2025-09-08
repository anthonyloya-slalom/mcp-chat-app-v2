import React from "react";
import dynamic from "next/dynamic";
import { IconButton, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import styles from "./ChartCard.module.css";

const Chart = dynamic(() => import("../Chart/Chart"), {
  ssr: false,
  loading: () => <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading chart...</div>
});

interface ChartCardProps {
  title: string;
  count?: number;
  chartType: "pie" | "donut" | "bar";
  chartData: any[];
  chartColors?: string[];
  pieDataKey?: string;
  barDataKey?: string;
  barXAxisKey?: string;
  yAxisLabel?: string;
}

export default function ChartCard({
  title,
  count,
  chartType,
  chartData,
  chartColors,
  pieDataKey,
  barDataKey,
  barXAxisKey,
  yAxisLabel,
}: ChartCardProps) {
  // Placeholder for save image functionality
  const handleSaveImage = () => {
    // Implement chart image export if needed
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Typography variant="h6" className={styles.title}>
          {title}
        </Typography>
        <IconButton className={styles.saveBtn} onClick={handleSaveImage} aria-label="Save chart image">
          <DownloadIcon />
        </IconButton>
      </div>
      {count && (
        <Typography variant="h3" className={styles.count}>
          {count}
        </Typography>
      )}
      <div className={styles.chartArea}>
        <Chart
          type={chartType}
          data={chartData}
          colors={chartColors}
          pieDataKey={pieDataKey}
          barDataKey={barDataKey}
          barXAxisKey={barXAxisKey}
          yAxisLabel={yAxisLabel}
          width={400}
          height={300}
        />
      </div>
    </div>
  );
}