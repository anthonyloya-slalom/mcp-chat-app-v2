import { mockChartData } from "../../lib/mock-chart-data";
import StatusCard from "../../components/Dashboard/StatusCard/StatusCard";
import ChartCard from "../../components/Dashboard/ChartCard/ChartCard";
import styles from "./Dashboard.module.css";

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

const chartData4 = [
	{ name: "HR", value: 4 },
	{ name: "Employee", value: 3 },
	{ name: "Tilt", value: 2 },
];

const leaveByStage = mockChartData.data[0].leave_by_stage_chart;
const barChartData = [
  {
    stage: "Approved by HR",
    "Approved by HR": leaveByStage.approved_hr.employees,
    "Approved by Employee": 0,
    "Rejected by HR": 0,
    "Sent to Employee": 0,
  },
  {
    stage: "Approved by Employee",
    "Approved by HR": 0,
    "Approved by Employee": leaveByStage.approved_employee.employees,
    "Rejected by HR": 0,
    "Sent to Employee": 0,
  },
  {
    stage: "Rejected by HR",
    "Approved by HR": 0,
    "Approved by Employee": 0,
    "Rejected by HR": leaveByStage.rejected_hr.employees,
    "Sent to Employee": 0,
  },
  {
    stage: "Sent to Employee",
    "Approved by HR": 0,
    "Approved by Employee": 0,
    "Rejected by HR": 0,
    "Sent to Employee": leaveByStage.sent_to_employee.employees,
  },
];

const barSeries = [
  { dataKey: "Approved by HR", label: "Approved by HR", color: "#6c4bb6" },
  { dataKey: "Approved by Employee", label: "Approved by Employee", color: "#22c55e" },
  { dataKey: "Rejected by HR", label: "Rejected by HR", color: "#f87171" },
  { dataKey: "Sent to Employee", label: "Sent to Employee", color: "#fbbf24" },
];

export default function Dashboard() {
	return (
		<div className={styles.dashboard}>
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
					count={mockChartData.data[0].active_leaves.employees_currently_on_leave}
					chartType="donut"
					chartData={donutChartData}
					chartColors={["#7c3aed", "#e67c30", "#3b7c8c", "#fbbf24", "#22c55e"]}
					pieDataKey="value"
				/>
				<ChartCard
					title="Leave by Stage"
					count={
						leaveByStage.approved_hr.employees +
						leaveByStage.approved_employee.employees +
						leaveByStage.rejected_hr.employees +
						leaveByStage.sent_to_employee.employees
					}
					chartType="bar"
					chartData={barChartData}
					barSeries={barSeries}
					barXAxisKey="stage"
					yAxisLabel="Number of Employees"
					legendPosition="bottom"
				/>
				<ChartCard
					title="Leave Count by State"
					count={mockChartData.data[0].overall_dataset_statistics.unique_employees}
					chartType="pie"
					chartData={chartDataByState}
					chartColors={["#6c4bb6", "#60a5fa", "#f87171", "#fbbf24", "#22c55e", "#a3a3a3"]}
					pieDataKey="value"
				/>
				<ChartCard
					title="Continuous vs. Intermittent Leaves"
					count={9}
					chartType="bar"
					chartData={chartData4}
					chartColors={["#e67c30", "#f87171", "#3b7c8c"]}
					barDataKey="value"
					barXAxisKey="name"
				/>
			</div>
		</div>
	);
}