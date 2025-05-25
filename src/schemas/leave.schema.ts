import { z } from 'zod';

// ===== LeaveType Schemas =====
export const createLeaveTypeSchema = z.object({
  name: z.string().min(1, { message: "Leave type name is required" }),
  defaultDays: z.number().int().min(0, { message: "Default days must be a non-negative integer" }),
  isPaid: z.boolean().default(true),
  description: z.string().optional().nullable(),
  // organizationId will be taken from session
});
export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;

export const updateLeaveTypeSchema = z.object({
  leaveTypeId: z.string().min(1),
  name: z.string().min(1).optional(),
  defaultDays: z.number().int().min(0).optional(),
  isPaid: z.boolean().optional(),
  description: z.string().optional().nullable(),
});
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;

// ===== LeaveApplication Schemas =====
export const leaveApplicationStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
export type LeaveApplicationStatusType = z.infer<typeof leaveApplicationStatusSchema>;

export const createLeaveApplicationSchema = z.object({
  // employeeId will be taken from session for self-application
  leaveTypeId: z.string().min(1, { message: "Leave type is required" }),
  startDate: z.coerce.date({ errorMap: () => ({ message: "Start date is required." }) }),
  endDate: z.coerce.date({ errorMap: () => ({ message: "End date is required." }) }),
  reason: z.string().min(1, { message: "Reason for leave is required" }).optional().nullable(),
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be before start date",
  path: ["endDate"], // Path of the error
});
export type CreateLeaveApplicationInput = z.infer<typeof createLeaveApplicationSchema>;

export const updateLeaveApplicationStatusSchema = z.object({
  applicationId: z.string().min(1),
  status: leaveApplicationStatusSchema.refine(val => val === 'APPROVED' || val === 'REJECTED', {
    message: "Status can only be updated to APPROVED or REJECTED through this action."
  }),
  comments: z.string().optional().nullable(),
});
export type UpdateLeaveApplicationStatusInput = z.infer<typeof updateLeaveApplicationStatusSchema>;

export const listLeaveApplicationsForOrgSchema = z.object({
    status: leaveApplicationStatusSchema.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.number().min(1).default(1).optional(),
    pageSize: z.number().min(1).max(100).default(10).optional(),
});
export type ListLeaveApplicationsForOrgInput = z.infer<typeof listLeaveApplicationsForOrgSchema>;


// ===== Holiday Schemas =====
export const createHolidaySchema = z.object({
  name: z.string().min(1, { message: "Holiday name is required" }),
  date: z.coerce.date({ errorMap: () => ({ message: "Date is required." }) }),
  // organizationId will be taken from session
});
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;

export const updateHolidaySchema = z.object({
  holidayId: z.string().min(1),
  name: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
});
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;

export const listHolidaysByOrgSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  // organizationId will be taken from session
});
export type ListHolidaysByOrgInput = z.infer<typeof listHolidaysByOrgSchema>;
