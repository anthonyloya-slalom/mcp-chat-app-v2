// Mock leave data for when MCP server is unavailable
export const mockLeaveData = {
  employees: [
    {
      id: 1,
      name: "Sarah Johnson",
      department: "Engineering",
      leaveType: "intermittent",
      startDate: "2024-01-15",
      endDate: "2024-12-31",
      hoursUsed: 120,
      hoursRemaining: 360,
      reason: "Caring for elderly parent with chronic condition"
    },
    {
      id: 2,
      name: "Michael Chen",
      department: "Marketing",
      leaveType: "continuous",
      startDate: "2024-03-01",
      endDate: "2024-05-15",
      hoursUsed: 480,
      hoursRemaining: 0,
      reason: "Post-surgery recovery for spouse"
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      department: "HR",
      leaveType: "intermittent",
      startDate: "2024-02-10",
      endDate: "2024-08-10",
      hoursUsed: 200,
      hoursRemaining: 280,
      reason: "Child with recurring medical appointments"
    },
    {
      id: 4,
      name: "David Park",
      department: "Finance",
      leaveType: "continuous",
      startDate: "2024-04-01",
      endDate: "2024-04-30",
      hoursUsed: 160,
      hoursRemaining: 320,
      reason: "Recovery from major surgery"
    },
    {
      id: 5,
      name: "Lisa Thompson",
      department: "Engineering",
      leaveType: "intermittent",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      hoursUsed: 80,
      hoursRemaining: 400,
      reason: "Parent with Alzheimer's disease"
    }
  ],
  statistics: {
    totalEmployeesOnLeave: 5,
    intermittentLeave: 3,
    continuousLeave: 2,
    averageHoursUsed: 168,
    departmentBreakdown: {
      Engineering: 2,
      Marketing: 1,
      HR: 1,
      Finance: 1
    },
    commonReasons: [
      { reason: "Elderly parent care", count: 2 },
      { reason: "Medical procedures", count: 2 },
      { reason: "Child care", count: 1 }
    ]
  }
};

// Function to search leave data based on query
export function searchLeaveData(query: string): any {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('intermittent') && lowerQuery.includes('continuous')) {
    // Return statistics about leave types
    return {
      summary: `Currently, ${mockLeaveData.statistics.intermittentLeave} employees (60%) are on intermittent leave and ${mockLeaveData.statistics.continuousLeave} employees (40%) are on continuous leave.`,
      intermittentEmployees: mockLeaveData.employees.filter(e => e.leaveType === 'intermittent'),
      continuousEmployees: mockLeaveData.employees.filter(e => e.leaveType === 'continuous'),
      insight: "Intermittent leave is more common, likely because it allows employees to maintain work continuity while managing caregiving responsibilities."
    };
  }
  
  if (lowerQuery.includes('department')) {
    return {
      summary: "Leave distribution by department",
      breakdown: mockLeaveData.statistics.departmentBreakdown,
      details: mockLeaveData.employees.map(e => ({
        name: e.name,
        department: e.department,
        leaveType: e.leaveType
      }))
    };
  }
  
  if (lowerQuery.includes('hours') || lowerQuery.includes('time')) {
    return {
      summary: `Average hours used: ${mockLeaveData.statistics.averageHoursUsed}`,
      employees: mockLeaveData.employees.map(e => ({
        name: e.name,
        hoursUsed: e.hoursUsed,
        hoursRemaining: e.hoursRemaining,
        totalAllocated: e.hoursUsed + e.hoursRemaining
      }))
    };
  }
  
  // Default response
  return {
    totalEmployees: mockLeaveData.statistics.totalEmployeesOnLeave,
    leaveTypes: {
      intermittent: mockLeaveData.statistics.intermittentLeave,
      continuous: mockLeaveData.statistics.continuousLeave
    },
    employees: mockLeaveData.employees
  };
}