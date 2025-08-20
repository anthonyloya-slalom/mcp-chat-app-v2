// Mock leave data to simulate MCP functionality
export interface LeaveRecord {
  leave_id: string;
  employee_id: string;
  leave_type: string;
  expected_leave_date: string;
  expected_return_date: string;
  is_leave_continuous: boolean;
  is_leave_intermittent: boolean;
  status: string;
  caregiver_type?: string;
  duration_days?: number;
}

// Sample of leave records focusing on CAREGIVER types
export const mockLeaveData: LeaveRecord[] = [
  {
    leave_id: "336f2f22",
    employee_id: "45751",
    leave_type: "CAREGIVER",
    expected_leave_date: "2024-11-07",
    expected_return_date: "2025-11-08",
    is_leave_continuous: false,
    is_leave_intermittent: true,
    status: "APPROVED_HR",
    caregiver_type: "CHILD_U18",
    duration_days: 366
  },
  {
    leave_id: "3ca1f1ac",
    employee_id: "97284",
    leave_type: "CAREGIVER",
    expected_leave_date: "2024-03-11",
    expected_return_date: "2024-04-12",
    is_leave_continuous: true,
    is_leave_intermittent: false,
    status: "APPROVED_HR",
    caregiver_type: "PARENT",
    duration_days: 32
  },
  {
    leave_id: "ee88c3cf",
    employee_id: "44632",
    leave_type: "CAREGIVER",
    expected_leave_date: "2023-11-16",
    expected_return_date: "2024-11-15",
    is_leave_continuous: false,
    is_leave_intermittent: true,
    status: "APPROVED_HR",
    caregiver_type: "CHILD_O18",
    duration_days: 365
  },
  {
    leave_id: "489fed05",
    employee_id: "42950",
    leave_type: "CAREGIVER",
    expected_leave_date: "2024-12-16",
    expected_return_date: "2025-02-04",
    is_leave_continuous: true,
    is_leave_intermittent: false,
    status: "APPROVED_HR",
    caregiver_type: "PARENT",
    duration_days: 50
  },
  {
    leave_id: "63e51a92",
    employee_id: "49769",
    leave_type: "CAREGIVER",
    expected_leave_date: "2023-05-13",
    expected_return_date: "2023-05-25",
    is_leave_continuous: true,
    is_leave_intermittent: false,
    status: "APPROVED_HR",
    caregiver_type: "PARENT",
    duration_days: 12
  },
  {
    leave_id: "d83bfe88",
    employee_id: "44649",
    leave_type: "CAREGIVER",
    expected_leave_date: "2023-11-10",
    expected_return_date: "2023-11-13",
    is_leave_continuous: false,
    is_leave_intermittent: false,
    status: "APPROVED_HR",
    caregiver_type: "CHILD_U18",
    duration_days: 3
  },
  {
    leave_id: "85e1c2d3",
    employee_id: "44821",
    leave_type: "CAREGIVER",
    expected_leave_date: "2025-02-25",
    expected_return_date: "2025-02-28",
    is_leave_continuous: true,
    is_leave_intermittent: false,
    status: "APPROVED_HR",
    caregiver_type: "PARENT",
    duration_days: 3
  },
  {
    leave_id: "ffa18c4e",
    employee_id: "46379",
    leave_type: "CAREGIVER",
    expected_leave_date: "2025-05-22",
    expected_return_date: "2025-08-28",
    is_leave_continuous: true,
    is_leave_intermittent: false,
    status: "APPROVED_HR",
    caregiver_type: "PARENT",
    duration_days: 98
  },
  {
    leave_id: "ca1d5e5e",
    employee_id: "44825",
    leave_type: "CAREGIVER",
    expected_leave_date: "2023-03-06",
    expected_return_date: "2023-03-30",
    is_leave_continuous: false,
    is_leave_intermittent: true,
    status: "APPROVED_HR",
    caregiver_type: "CHILD_U18",
    duration_days: 24
  },
  {
    leave_id: "3c251b93",
    employee_id: "42759",
    leave_type: "CAREGIVER",
    expected_leave_date: "2023-03-14",
    expected_return_date: "2024-03-13",
    is_leave_continuous: false,
    is_leave_intermittent: false,
    status: "APPROVED_HR",
    caregiver_type: "SPOUSE",
    duration_days: 365
  }
];

// Mock query functions to simulate database queries
export function calculateAverageDuration(): number {
  const validLeaves = mockLeaveData.filter(leave => 
    leave.expected_leave_date && leave.expected_return_date
  );
  
  const durations = validLeaves.map(leave => {
    const start = new Date(leave.expected_leave_date);
    const end = new Date(leave.expected_return_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  });
  
  const sum = durations.reduce((a, b) => a + b, 0);
  return Math.round(sum / durations.length);
}

export function getLeaveStatistics() {
  const avgDuration = calculateAverageDuration();
  const totalLeaves = mockLeaveData.length;
  
  const continuousLeaves = mockLeaveData.filter(l => l.is_leave_continuous).length;
  const intermittentLeaves = mockLeaveData.filter(l => l.is_leave_intermittent).length;
  
  const caregiverTypes = mockLeaveData.reduce((acc, leave) => {
    if (leave.caregiver_type) {
      acc[leave.caregiver_type] = (acc[leave.caregiver_type] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  return {
    average_duration_days: avgDuration,
    total_leaves: totalLeaves,
    continuous_leaves: continuousLeaves,
    intermittent_leaves: intermittentLeaves,
    caregiver_types: caregiverTypes,
    min_duration: Math.min(...mockLeaveData.map(l => l.duration_days || 0)),
    max_duration: Math.max(...mockLeaveData.map(l => l.duration_days || 0))
  };
}

export function queryLeaveData(query: string): any {
  // Parse the query and return appropriate mock data
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('avg') && queryLower.includes('datediff')) {
    // Average duration query
    const stats = getLeaveStatistics();
    return {
      AVG_CAREGIVER_LEAVE_DAYS: stats.average_duration_days,
      TOTAL_LEAVES: stats.total_leaves,
      MIN_DAYS: stats.min_duration,
      MAX_DAYS: stats.max_duration
    };
  }
  
  if (queryLower.includes('count') && queryLower.includes('continuous')) {
    // Continuous vs intermittent query
    const stats = getLeaveStatistics();
    return {
      CONTINUOUS_LEAVES: stats.continuous_leaves,
      INTERMITTENT_LEAVES: stats.intermittent_leaves,
      TOTAL: stats.total_leaves
    };
  }
  
  if (queryLower.includes('caregiver_type')) {
    // Caregiver type breakdown
    const stats = getLeaveStatistics();
    return Object.entries(stats.caregiver_types).map(([type, count]) => ({
      CAREGIVER_TYPE: type,
      COUNT: count
    }));
  }
  
  // Default: return summary statistics
  return getLeaveStatistics();
}