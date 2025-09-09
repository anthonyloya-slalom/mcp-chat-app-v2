import React from "react";
import dynamic from "next/dynamic";
import { IconButton, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import styles from "./ChartCard.module.css";
import ChartPercentageSummary from "../Chart/Summaries/PercentageSummary/PercentageSummary";
import { CountSummary } from "../Chart/Summaries/CountSummary/CountSummary";

const Chart = dynamic(() => import("../Chart/Chart"), {
  ssr: false,
  loading: () => <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading chart...</div>
});

interface ChartCardProps {
  title: string;
  countSummary?: any[];
  chartType: "pie" | "donut" | "bar";
  chartData: any[];
  pieDataKey?: string;
  barDataKey?: string;
  barXAxisKey?: string;
  yAxisLabel?: string;
  summary?: React.ReactNode;
  categoryGapRatio?: number;
  showXAxisLabel?: boolean;
}

export default function ChartCard({
  title,
  countSummary,
  chartType,
  chartData,
  pieDataKey,
  barDataKey,
  barXAxisKey,
  yAxisLabel,
  summary,
  categoryGapRatio,
  showXAxisLabel,
}: ChartCardProps) {
  // Placeholder for save image functionality
  const handleSaveImage = () => {
  };

  let summaryNode = summary;
  if (title === "Leave by Stage" && !summary) {
    const total = chartData.reduce((sum, d) => sum + d.value, 0);
    const percentages = chartData.map((item: any) => ({
      value: item.value,
      percent: total ? ((item.value / total) * 100).toFixed(1) : "0.0"
    }));
    summaryNode = (
      <ChartPercentageSummary
        items={percentages}
      />
    );
  }

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
      {Array.isArray(countSummary) ? (
        <Typography variant="h3" className={styles.count}>
          <CountSummary items={countSummary} />
        </Typography>
      ) : countSummary && (
        <Typography variant="h3" className={styles.count}>
          {countSummary}
        </Typography>
      )}
      <div className={styles.chartArea}>
        <Chart
          type={chartType}
          data={chartData}
          pieDataKey={pieDataKey}
          barDataKey={barDataKey}
          barXAxisKey={barXAxisKey}
          yAxisLabel={yAxisLabel}
          width={400}
          height={300}
          categoryGapRatio={categoryGapRatio}
          showXAxisLabel={showXAxisLabel}
        />
      </div>
      {summaryNode && (
        <div className={styles.summary}>
          {summaryNode}
        </div>
      )}
    </div>
  );
}