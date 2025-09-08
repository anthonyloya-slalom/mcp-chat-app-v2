import React from "react";
import { MenuItem, Select } from "@mui/material";
import styles from "./TimeRangeDropdown.module.css";

export interface TimeRangeDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const TIME_RANGES = [
  "This Quarter",
  "Current Year",
  "Past 12 Months",
  "All Time",
  "Custom Range",
];

export default function TimeRangeDropdown({
  value,
  onChange,
  className = "",
}: TimeRangeDropdownProps) {
  return (
    <Select
      value={value}
      onChange={e => onChange(e.target.value)}
      variant="outlined"
      size="small"
      className={`${styles.timeRangeSelect} ${className}`}
      MenuProps={{ PaperProps: { style: { minWidth: 140 } } }}
    >
      {TIME_RANGES.map((range) => (
        <MenuItem key={range} value={range}>
          {range}
        </MenuItem>
      ))}
    </Select>
  );
}