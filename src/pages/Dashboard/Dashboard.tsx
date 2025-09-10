import { mockChartData } from "../../lib/mock-chart-data";
import StatusCard from "../../components/Dashboard/StatusCard/StatusCard";
import ChartCard from "../../components/Dashboard/ChartCard/ChartCard";
import styles from "./Dashboard.module.css";
import React from "react";
import TimeRangeDropdown from "@/components/Dashboard/Dropdowns/TimeRangeDropdown/TimeRangeDropdown";
import LeaveTypesDropdown from "@/components/Dashboard/Dropdowns/LeaveTypesDropdown/LeaveTypesDropdown";

const leaveTypes = [
  "Medical",
  "Parental",
  "Caregiver",
  "Other",
];

const underReview = mockChartData.data[0].leave_status_breakdown.under_review;

const waitingOnHr = underReview.waiting_on_hr;
const waitingOnEmployee = underReview.waiting_on_employee;
const totalUnderReview = underReview.total_under_review;
const totalActiveLeaves = mockChartData.data[0].active_leaves;

const topStates = mockChartData.data[0].geographic_distribution.top_10_states;
const top5 = topStates.slice(0, 5);
const others = topStates.slice(5);

const top5ChartData = top5.map((state) => ({
  name: state.state_name,
  value: state.employees,
}));

const othersValue = others.reduce((sum, state) => sum + state.employees, 0);

const chartDataByState = [
  ...top5ChartData,
  { name: "Others", value: othersValue },
];

const activeByLeaveType = mockChartData.data[0].active_leaves.active_by_leave_type;
const donutChartData = Object.entries(activeByLeaveType).map(([type, obj]) => ({
  name: type.charAt(0) + type.slice(1).toLowerCase(),
  value: obj.employees,
}));

const leaveByStage = mockChartData.data[0].leave_by_stage_chart;
const barChartData = [
  { name: "Approved by HR", value: leaveByStage.approved_hr.employees },
  { name: "Approved by Employee", value: leaveByStage.approved_employee.employees },
  { name: "Rejected by HR", value: leaveByStage.rejected_hr.employees },
  { name: "Sent to Employee", value: leaveByStage.sent_to_employee.employees },
];

const continuousSummary = mockChartData.data[0].continuous_vs_intermittent_chart.summary;

const continuousCount = continuousSummary.continuous.total_employees;
const intermittentCount = continuousSummary.intermittent.total_employees;
const unknownCount = continuousSummary.unknown.total_employees;

type LeaveTypeKey = "medical" | "parental" | "caregiver" | "other";
type ByLeaveType = Record<LeaveTypeKey, {
  continuous: { records: number; plans: number; employees: number; };
  intermittent: { records: number; plans: number; employees: number; };
  unknown: { records: number; plans: number; employees: number; };
}>;

const byLeaveType = mockChartData.data[0].continuous_vs_intermittent_chart.by_leave_type as ByLeaveType;

const leaveTypeKeys: LeaveTypeKey[] = ["medical", "parental", "caregiver", "other"];
const leaveTypeLabels = ["Medical", "Parental", "Caregiver", "Other"];

const stackedBarData = [
  {
    name: "Continuous",
    ...leaveTypeKeys.reduce((acc, key) => {
      acc[key] = byLeaveType[key].continuous.employees;
      return acc;
    }, {} as Record<string, number>)
  },
  {
    name: "Intermittent",
    ...leaveTypeKeys.reduce((acc, key) => {
      acc[key] = byLeaveType[key].intermittent.employees;
      return acc;
    }, {} as Record<string, number>)
  }
];

export default function Dashboard() {
    const [quarter, setQuarter] = React.useState("This Quarter");
    const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);

    return (
        <div className={styles.dashboard}>
            <div className={styles.contentGrid}>
                <div className={styles.dashboardHeader}>
                    <h1 className={styles.dashboardTitle}>Dashboard</h1>
                    <div className={styles.dashboardFilters}>
                        <TimeRangeDropdown
                          value={quarter}
                          onChange={setQuarter}
                        />
                        <LeaveTypesDropdown
                          value={selectedTypes}
                          onChange={setSelectedTypes}
                        />
                    </div>
                </div>
                <div className={styles.statusRow}>
                    <StatusCard
                        count={waitingOnHr?.employees ?? 0}
                        title="Waiting on HR"
                        subtitle="Avg. 2.4 days pending"
                        color="#e67c30"
                    />
                    <StatusCard
                        count={waitingOnEmployee?.employees ?? 0}
                        title="Waiting on Employee"
                        subtitle="Documentation needed"
                        color="#e67c30"
                    />
                    <StatusCard
                        count={totalUnderReview?.employees ?? 0}
                        title="Under Review by Tilt"
                        subtitle="Processing approval"
                        color="#3b7c8c"
                    />
                    <StatusCard
                        count={totalActiveLeaves?.employees_currently_on_leave ?? 0}
                        title="Active Leaves"
                        subtitle="4 starting this week"
                        color="#6c4bb6"
                    />
                </div>
                <div className={styles.chartsGrid}>
                    <ChartCard
                        title="Total Leaves"
                        countSummary={mockChartData.data[0].active_leaves.employees_currently_on_leave}
                        chartType="donut"
                        chartData={donutChartData}
                        pieDataKey="value"
                    />
                    <ChartCard
                        title="Leave by Stage"
                        chartType="bar"
                        chartData={barChartData}
                        barDataKey="value"
                        barXAxisKey="name"
                        yAxisLabel="Number of Employees"
                        categoryGapRatio={0.05}
                        showXAxisLabel={false}
                    />
                    <ChartCard
                        title="Leave Count by State"
                        countSummary={mockChartData.data[0].overall_dataset_statistics.unique_employees}
                        chartType="pie"
                        chartData={chartDataByState}
                        pieDataKey="value"
                    />
                    <ChartCard
                        title="Continuous vs. Intermittent Leaves"
                        chartType="bar"
                        chartData={stackedBarData}
                        countSummary={[
                            { label: "Continuous", value: continuousCount },
                            { label: "Intermittent", value: intermittentCount },
                            { label: "Unknown", value: unknownCount },
                        ]}
                        barDataKey={leaveTypeKeys}
                        barXAxisKey="name"
                        yAxisLabel="Number of Leaves"
                        categoryGapRatio={0.6}
                    />
                </div>
            </div>
        </div>
    );
}