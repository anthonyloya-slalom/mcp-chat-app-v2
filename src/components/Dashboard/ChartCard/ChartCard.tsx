import React from "react";
import { IconButton, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import Chart from "../Chart/Chart";
import styles from "./ChartCard.module.css";

interface ChartCardProps {
  title: string;
  count: number;
  chartType: "pie" | "donut" | "bar";
  chartData: any[];
  chartColors?: string[];
  pieDataKey?: string;
  barDataKey?: string;
  barXAxisKey?: string;
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
      <Typography variant="h3" className={styles.count}>
        {count}
      </Typography>
      <div className={styles.chartArea}>
        <Chart
          type={chartType}
          data={chartData}
          colors={chartColors}
          pieDataKey={pieDataKey}
          barDataKey={barDataKey}
          barXAxisKey={barXAxisKey}
          width={400}
          height={300}
        />
      </div>
    </div>
  );
}