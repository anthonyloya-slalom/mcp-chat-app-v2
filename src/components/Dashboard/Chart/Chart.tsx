import React from "react";
import { colors } from "@/components/constants/colors";
import {
  PieChart,
  BarChart,
} from "@mui/x-charts";
import styles from "./Chart.module.css";

type ChartType = "pie" | "donut" | "bar";

interface ChartProps {
  type: ChartType;
  data: any[];
  width?: number | string;
  height?: number | string;
  title?: string;
  pieDataKey?: string;
  barDataKey?: string;
  barXAxisKey?: string;
  yAxisLabel?: string;
}

export default function Chart({
  type,
  data,
  width = "100%",
  height = 300,
  title,
  pieDataKey = "value",
  barDataKey = "value",
  barXAxisKey = "name",
  yAxisLabel = "name",
}: ChartProps) {

  const pieSeries = [
    {
      data: data.map((d, i) => ({
        id: d.id ?? d[barXAxisKey] ?? i,
        value: d[pieDataKey],
        label: d.name ?? d[barXAxisKey] ?? "",
        color: colors[i % colors.length],
      })),
      innerRadius: type === "donut" ? 60 : 0,
      outerRadius: 120,
      paddingAngle: 2,
      cornerRadius: 4,
      valueLabel: "label",
      valueLabelPlacement: "center" as const,
      valueLabelDisplay: "inside",
      valueLabelStyle: { fontWeight: 700, fontSize: 16, color: "white" },
      arcLabel: (params) => params.value ?? '',
    },
  ];

  const barSeries = data.map((item, index) => ({
    data: data.map((d, i) => i === index ? d[barDataKey] : null),
    label: item[barXAxisKey],
    color: colors[index % colors.length],
    valueFormatter: (value: number | null) => value ? value.toString() : '',
  }));

  const barXAxis = [
    {
      data: data.map(() => ''),
      scaleType: "band" as const,
    },
  ];

  return (
    <div className={styles.chartContainer}>
      {title && <div className={styles.chartTitle}>{title}</div>}
      <div className={styles.chartArea}>
        {type === "pie" || type === "donut" ? (
          <PieChart
            series={pieSeries}
            width={typeof width === "number" ? width : 440}
            height={typeof height === "number" ? height : 340}
          />
        ) : (
          <BarChart
            series={barSeries}
            xAxis={barXAxis}
            yAxis={[{ label: yAxisLabel }]}
            width={typeof width === "number" ? width : 300}
            height={typeof height === "number" ? height : 220}
            slotProps={{
              legend: {
                direction: 'horizontal',
                position: { vertical: 'bottom', horizontal: 'center' },
              },
            }}
            margin={{ top: 20, right: 20, bottom: 10, left: 20 }}
          />
        )}
      </div>
    </div>
  );
}