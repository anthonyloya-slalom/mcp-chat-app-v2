import StatusCard from "../../components/Dashboard/StatusCard/StatusCard";
import ChartCard from "../../components/Dashboard/ChartCard/ChartCard";
import styles from "./Dashboard.module.css";

const chartData1 = [
	{ name: "California", value: 17 },
	{ name: "Oregon", value: 10 },
	{ name: "Washington", value: 8 },
	{ name: "Nevada", value: 5 },
	{ name: "Arizona", value: 2 },
];

const chartData2 = [
	{ name: "Continuous", value: 30 },
	{ name: "Intermittent", value: 12 },
];

const chartData3 = [
	{ name: "Approved", value: 35 },
	{ name: "Pending", value: 7 },
];

const chartData4 = [
	{ name: "HR", value: 4 },
	{ name: "Employee", value: 3 },
	{ name: "Tilt", value: 2 },
];

export default function Dashboard() {
	return (
		<div className={styles.dashboard}>
			<div className={styles.statusRow}>
				<StatusCard
					count={4}
					title="Waiting on HR"
					subtitle="Avg. 2.4 days pending"
					color="#e67c30"
				/>
				<StatusCard
					count={3}
					title="Waiting on Employee"
					subtitle="Documentation needed"
					color="#e67c30"
				/>
				<StatusCard
					count={2}
					title="Under Review by Tilt"
					subtitle="Processing approval"
					color="#3b7c8c"
				/>
				<StatusCard
					count={42}
					title="Active Leaves"
					subtitle="4 starting this week"
					color="#6c4bb6"
				/>
			</div>
			<div className={styles.chartsGrid}>
				<ChartCard
					title="Leave Count by State"
					count={42}
					chartType="pie"
					chartData={chartData1}
					chartColors={[
						"#6c4bb6",
						"#60a5fa",
						"#f87171",
						"#fbbf24",
						"#22c55e",
					]}
					pieDataKey="value"
				/>
				<ChartCard
					title="Leave Type Distribution"
					count={42}
					chartType="donut"
					chartData={chartData2}
					chartColors={["#3b7c8c", "#e67c30"]}
					pieDataKey="value"
				/>
				<ChartCard
					title="Approval Status"
					count={42}
					chartType="pie"
					chartData={chartData3}
					chartColors={["#22c55e", "#fbbf24"]}
					pieDataKey="value"
				/>
				<ChartCard
					title="Pending Reviews"
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