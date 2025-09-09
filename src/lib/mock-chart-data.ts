export const mockChartData = {
    data: [
            {
                "overall_dataset_statistics": {
                    "total_records": 96409,
                    "unique_employees": 976,
                    "unique_leave_plans": 685,
                    "date_range": {
                    "earliest_record_date": "2022-07-19",
                    "latest_record_date": "2026-09-29",
                    "earliest_leave_start": "2022-08-30", 
                    "latest_expected_return": "2026-08-21"
                    },
                    "active_records": 96409,
                    "data_structure_note": "Each record represents one day of leave per employee"
                },
                "active_leaves": {
                    "as_of_date": "2025-09-05",
                    "total_active_records": 4178,
                    "employees_currently_on_leave": 44,
                    "active_leave_plans": 44,
                    "active_by_leave_type": {
                    "MEDICAL": {
                        "records": 2312,
                        "employees": 23
                    },
                    "PARENTAL": {
                        "records": 1675,
                        "employees": 18
                    },
                    "CAREGIVER": {
                        "records": 191,
                        "employees": 3
                    },
                    "OTHER": {
                        "records": 0,
                        "employees": 0
                    }
                    }
                },
                "leave_by_stage_chart": {
                    "approved_hr": {
                    "records": 91227,
                    "leave_plans": 1241,
                    "employees": 278,
                    "percentage": 94.61
                    },
                    "approved_employee": {
                    "records": 4224,
                    "leave_plans": 85,
                    "employees": 74,
                    "percentage": 4.38
                    },
                    "rejected_hr": {
                    "records": 841,
                    "leave_plans": 0,
                    "employees": 24,
                    "percentage": 0.87
                    },
                    "sent_to_employee": {
                    "records": 117,
                    "leave_plans": 0,
                    "employees": 21,
                    "percentage": 0.12
                    }
                },
                "continuous_vs_intermittent_chart": {
                    "summary": {
                        "continuous": {
                        "total_employees": 849,
                        "total_plans": 1040,
                        "total_records": 54656,
                        "percentage": 56.68
                        },
                        "intermittent": {
                        "total_employees": 140,
                        "total_plans": 151,
                        "total_records": 30248,
                        "percentage": 31.38
                        },
                        "unknown": {
                        "total_employees": 135,
                        "total_plans": 135,
                        "total_records": 11505,
                        "percentage": 11.94
                        }
                    },
                    "by_leave_type": {
                    "medical": {
                        "continuous": {"records": 29363, "plans": 556, "employees": 470},
                        "intermittent": {"records": 18343, "plans": 86, "employees": 79},
                        "unknown": {"records": 3740, "plans": 45, "employees": 51}
                    },
                    "parental": {
                        "continuous": {"records": 19484, "plans": 240, "employees": 223},
                        "intermittent": {"records": 629, "plans": 5, "employees": 7},
                        "unknown": {"records": 2540, "plans": 23, "employees": 24}
                    },
                    "caregiver": {
                        "continuous": {"records": 3284, "plans": 75, "employees": 72},
                        "intermittent": {"records": 10951, "plans": 49, "employees": 45},
                        "unknown": {"records": 4807, "plans": 34, "employees": 31}
                    },
                    "other": {
                        "continuous": {"records": 1767, "plans": 153, "employees": 144},
                        "intermittent": {"records": 306, "plans": 10, "employees": 10},
                        "unknown": {"records": 418, "plans": 33, "employees": 32}
                    }
                    }
                },
                "leaves_under_review": {
                    "waiting_on_hr": {
                    "records": 15,
                    "employees": 1,
                    "percentage": 0.02,
                    "status_code": "SENT_TO_HR"
                    },
                    "waiting_on_employee": {
                    "records": 124,
                    "employees": 22,
                    "percentage": 0.13,
                    "status_code": "SENT_TO_EMPLOYEE"
                    },
                    "total_under_review": {
                    "records": 139,
                    "employees": 23,
                    "percentage": 0.15
                    }
                },
                "leave_status_breakdown": {
                    "approved_leaves": {
                    "hr_approved": {
                        "records": 91227,
                        "employees": 978,
                        "leave_plans": 1241,
                        "percentage": 94.61,
                        "status_code": "APPROVED_HR"
                    },
                    "employee_approved": {
                        "records": 4224,
                        "employees": 74,
                        "leave_plans": 85,
                        "percentage": 4.38,
                        "status_code": "APPROVED_EMPLOYEE"
                    },
                    "total_approved": {
                        "records": 95451,
                        "employees": 978,
                        "leave_plans": 1326,
                        "percentage": 98.99
                    }
                    },
                    "under_review": {
                    "waiting_on_hr": {
                        "records": 15,
                        "employees": 1,
                        "percentage": 0.02,
                        "status_code": "SENT_TO_HR"
                    },
                    "waiting_on_employee": {
                        "records": 117,
                        "employees": 21,
                        "percentage": 0.12,
                        "status_code": "SENT_TO_EMPLOYEE"
                    },
                    "total_under_review": {
                        "records": 132,
                        "employees": 22,
                        "percentage": 0.14
                    }
                    },
                    "rejected_leaves": {
                    "hr_rejected": {
                        "records": 841,
                        "employees": 24,
                        "percentage": 0.87,
                        "status_code": "REJECTED_HR"
                    }
                    }
                },
                "leave_types_breakdown": [
                    {
                    "leave_type": "MEDICAL",
                    "records": 51446,
                    "employees": 554,
                    "unique_plans": 685,
                    "percentage_of_total": 53.4,
                    "currently_active": {
                        "records": 2312,
                        "employees": 23
                    },
                    "pattern_breakdown": {
                        "continuous": {"records": 29363, "plans": 556, "employees": 470},
                        "intermittent": {"records": 18343, "plans": 86, "employees": 79},
                        "unknown": {"records": 3740, "plans": 45, "employees": 51}
                    },
                    "date_range": {
                        "earliest": "2022-08-30",
                        "latest": "2026-08-21"
                    }
                    },
                    {
                    "leave_type": "PARENTAL", 
                    "records": 22653,
                    "employees": 254,
                    "unique_plans": 268,
                    "percentage_of_total": 23.5,
                    "currently_active": {
                        "records": 1675,
                        "employees": 18
                    },
                    "pattern_breakdown": {
                        "continuous": {"records": 19484, "plans": 240, "employees": 223},
                        "intermittent": {"records": 629, "plans": 5, "employees": 7},
                        "unknown": {"records": 2540, "plans": 23, "employees": 24}
                    },
                    "date_range": {
                        "earliest": "2022-10-17",
                        "latest": "2026-04-28"
                    }
                    },
                    {
                    "leave_type": "CAREGIVER",
                    "records": 19042,
                    "employees": 148,
                    "unique_plans": 158,
                    "percentage_of_total": 19.8,
                    "currently_active": {
                        "records": 191,
                        "employees": 3
                    },
                    "pattern_breakdown": {
                        "continuous": {"records": 3284, "plans": 75, "employees": 72},
                        "intermittent": {"records": 10951, "plans": 49, "employees": 45},
                        "unknown": {"records": 4807, "plans": 34, "employees": 31}
                    },
                    "date_range": {
                        "earliest": "2022-07-19",
                        "latest": "2026-09-29"
                    }
                    },
                    {
                    "leave_type": "OTHER",
                    "records": 2491,
                    "employees": 186,
                    "unique_plans": 196,
                    "percentage_of_total": 2.6,
                    "currently_active": {
                        "records": 0,
                        "employees": 0
                    },
                    "pattern_breakdown": {
                        "continuous": {"records": 1767, "plans": 153, "employees": 144},
                        "intermittent": {"records": 306, "plans": 10, "employees": 10},
                        "unknown": {"records": 418, "plans": 33, "employees": 32}
                    },
                    "date_range": {
                        "earliest": "2023-01-09",
                        "latest": "2025-09-15"
                    }
                    },
                    {
                    "leave_type": "MILITARY",
                    "records": 777,
                    "employees": 10,
                    "unique_plans": 17,
                    "percentage_of_total": 0.8,
                    "currently_active": {
                        "records": 0,
                        "employees": 0
                    },
                    "pattern_breakdown": {
                        "continuous": {"records": 758, "plans": 16, "employees": 8},
                        "intermittent": {"records": 19, "plans": 1, "employees": 2},
                        "unknown": {"records": 0, "plans": 0, "employees": 0}
                    },
                    "date_range": {
                        "earliest": "2023-01-17",
                        "latest": "2025-03-31"
                    }
                    }
                ],
                "geographic_distribution": {
                    "top_10_states": [
                    {
                        "state_code": "CA", 
                        "state_name": "California",
                        "records": 10774,
                        "employees": 111,
                        "percentage_of_total_records": 11.19
                    },
                    {
                        "state_code": "WA",
                        "state_name": "Washington", 
                        "records": 8305,
                        "employees": 71,
                        "percentage_of_total_records": 8.62
                    },
                    {
                        "state_code": "FL",
                        "state_name": "Florida",
                        "records": 6017,
                        "employees": 74,
                        "percentage_of_total_records": 6.25
                    },
                    {
                        "state_code": "IL",
                        "state_name": "Illinois",
                        "records": 5233,
                        "employees": 63,
                        "percentage_of_total_records": 5.43
                    },
                    {
                        "state_code": "AZ",
                        "state_name": "Arizona",
                        "records": 3501,
                        "employees": 32,
                        "percentage_of_total_records": 3.63
                    },
                    ]
                },
                "quick_answers_for_charts": {
                    "leaves_under_review": {
                    "total_records": 132,
                    "total_employees": 22,
                    "breakdown": {
                        "waiting_on_hr": 15,
                        "waiting_on_employee": 117
                    }
                    },
                    "active_leaves": {
                    "total_records": 4178,
                    "total_employees": 44,
                    "breakdown_by_type": {
                        "medical": 23,
                        "parental": 18,
                        "caregiver": 3,
                        "other": 0,
                    }
                    },
                    "leave_by_stage": {
                        "approved_hr": 91227,
                        "approved_employee": 4224,
                        "rejected_hr": 841,
                        "sent_to_employee": 117
                    },
                    "continuous_vs_intermittent": {
                        "continuous": 54656,
                        "intermittent": 30248,
                        "unknown": 11505
                    },
                    "status_mapping_confirmed": {
                    "SENT_TO_HR": "waiting_on_hr",
                    "SENT_TO_EMPLOYEE": "waiting_on_employee", 
                    "APPROVED_HR": "approved_by_hr",
                    "APPROVED_EMPLOYEE": "approved_by_employee",
                    "REJECTED_HR": "rejected_by_hr"
                    }
                },
                "key_metrics_summary": {
                    "approval_rate": 98.99,
                    "rejection_rate": 0.87,
                    "under_review_rate": 0.14,
                    "currently_active_rate": 4.33,
                    "continuous_leave_rate": 56.68,
                    "intermittent_leave_rate": 31.38,
                    "average_records_per_employee": 98.7,
                    "average_records_per_plan": 140.6,
                    "most_common_leave_type": "MEDICAL",
                    "highest_activity_state": "TX"
                },
                "metadata": {
                    "data_source": "DEV.TEMP.LEAVES_SLALOM",
                    "analysis_date": "2025-09-05",
                    "total_records_analyzed": 96409,
                    "query_filters": ["IS_DELETED = FALSE"],
                    "active_leaves_criteria": "SCHEDULE_FROM <= '2025-09-05' AND SCHEDULE_TO >= '2025-09-05'",
                    "charts_included": ["leave_by_stage", "continuous_vs_intermittent", "geographic_distribution", "leave_types_breakdown"]
                }
                }
    ],
};