import React from "react";
import { MenuItem, Select, Checkbox, ListItemText } from "@mui/material";
import styles from "./LeaveTypesDropdown.module.css";

export interface LeaveTypesDropdownProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

const leaveTypes = [
  "Medical",
  "Parental",
  "Caregiver",
  "Other",
];

export default function LeaveTypesDropdown({
  value,
  onChange,
  className = "",
}: LeaveTypesDropdownProps) {
  const handleChange = (event: any) => {
    const val = event.target.value;
    onChange(typeof val === "string" ? val.split(",") : val);
  };

  return (
    <Select
      multiple
      displayEmpty
      value={value}
      onChange={handleChange}
      variant="outlined"
      size="small"
      className={`${styles.leaveTypesSelect} ${className}`}
      renderValue={(selected) => {
        const selectedArr = selected as string[];
        if (selectedArr.length === 0) return "All types";
        return selectedArr[selectedArr.length - 1];
      }}
      MenuProps={{ PaperProps: { style: { minWidth: 160 } } }}
    >
      <MenuItem value="">
        <Checkbox checked={value.length === 0} />
        <ListItemText primary="All types" />
      </MenuItem>
      {leaveTypes.map((type) => (
        <MenuItem key={type} value={type}>
          <Checkbox checked={value.indexOf(type) > -1} />
          <ListItemText primary={type} />
        </MenuItem>
      ))}
    </Select>
  );
}