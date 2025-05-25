import { z } from 'zod';

export const createSalaryAssignmentSchema = z.object({
  employeeId: z.string().min(1, { message: "Employee ID is required" }),
  structureId: z.string().min(1, { message: "Salary structure ID is required" }),
  effectiveDate: z.coerce.date({ errorMap: () => ({ message: "Effective date is required and must be a valid date." }) }),
  basicSalary: z.number().positive({ message: "Basic salary must be a positive number" }),
  customValues: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().nullable()
    .describe("JSON object for custom component values, e.g., {\"componentId1\": 100, \"componentId2\": \"override_value\"}"),
  // organizationId will be taken from session
  // isActive will be set by the backend logic
});

export type CreateSalaryAssignmentInput = z.infer<typeof createSalaryAssignmentSchema>;

export const updateSalaryAssignmentSchema = z.object({
  assignmentId: z.string().min(1),
  structureId: z.string().min(1).optional(),
  effectiveDate: z.coerce.date().optional(),
  basicSalary: z.number().positive().optional(),
  customValues: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().nullable(),
  isActive: z.boolean().optional(), // Allow explicitly activating/deactivating, though assignStructureToEmployee handles setting others to false.
});

export type UpdateSalaryAssignmentInput = z.infer<typeof updateSalaryAssignmentSchema>;

// Schema for listing assignments for an employee
export const listEmployeeAssignmentsSchema = z.object({
  employeeId: z.string().min(1),
});

export type ListEmployeeAssignmentsInput = z.infer<typeof listEmployeeAssignmentsSchema>;
