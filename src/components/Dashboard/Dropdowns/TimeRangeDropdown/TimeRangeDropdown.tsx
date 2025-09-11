import React from "react";
import { MenuItem, Select } from "@mui/material";
import { timeRanges } from "@/lib/constants";
import styles from "./TimeRangeDropdown.module.css";

export interface TimeRangeDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

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
      {timeRanges.map((range) => (
        <MenuItem key={range} value={range}>
          {range}
        </MenuItem>
      ))}
    </Select>
  );
}