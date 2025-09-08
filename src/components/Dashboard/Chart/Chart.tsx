import React from "react";
import { Box, Typography } from "@mui/material";
import {
  PieChart,
  PieChartProps,
  BarChart,
  BarChartProps,
  ChartsColorPalette,
} from "@mui/x-charts";

type ChartType = "pie" | "donut" | "bar";

interface ChartProps {
  type: ChartType;
  data: any[];
  colors?: string[];
  width?: number | string;
  height?: number | string;
  title?: string;
  pieDataKey?: string;
  barDataKey?: string;
  barXAxisKey?: string;
  yAxisLabel?: string;
}

const DEFAULT_COLORS = ["#7c3aed", "#e67c30", "#3b7c8c", "#6c4bb6", "#22c55e", "#ef4444"];

export default function Chart({
  type,
  data,
  colors = DEFAULT_COLORS,
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
      innerRadius: type === "donut" ? 60 : 0,   // Increased inner radius for donut
      outerRadius: 120,                         // Increased outer radius for bigger pie
      paddingAngle: 2,
      cornerRadius: 4,
      valueLabel: "label",
      valueLabelPlacement: "center" as const,
      valueLabelDisplay: "inside",
      valueLabelStyle: { fontWeight: 700, fontSize: 16, color: "white" },
      arcLabel: (params) => params.value ?? '',
    },
  ];

  // Create individual series for each bar to enable different colors
  const barSeries = data.map((item, index) => ({
    data: data.map((d, i) => i === index ? d[barDataKey] : null),
    label: item[barXAxisKey],
    color: colors[index % colors.length],
    valueFormatter: (value: number | null) => value ? value.toString() : '',
  }));
  
  const barXAxis = [
    {
      data: data.map(() => ''), // Empty labels for x-axis
      scaleType: "band" as const,
    },
  ];

  return (
    <Box sx={{ width, height, background: "#fff", borderRadius: 2, boxShadow: 1, p: 2 }}>
      {title && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
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
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        />
      )}
    </Box>
  );
}