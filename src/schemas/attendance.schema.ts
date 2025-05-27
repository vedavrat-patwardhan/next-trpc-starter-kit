import { z } from 'zod';

// ===== AttendanceStatus Enum =====
export const attendanceStatusSchema = z.enum([
  'PRESENT',
  'ABSENT',
  'LATE',
  'HALF_DAY',
  'LEAVE',
  'HOLIDAY',
]);
export type AttendanceStatusType = z.infer<typeof attendanceStatusSchema>;

// ===== Base Attendance Schema =====
// This can be used for Prisma type generation if needed, or as a base for other schemas.
export const baseAttendanceSchema = z.object({
  employeeId: z.string().min(1, { message: "Employee ID is required" }),
  date: z.coerce.date({ errorMap: () => ({ message: "Valid date is required." }) }),
  status: attendanceStatusSchema,
  checkInTime: z.coerce.date().optional().nullable(),
  checkOutTime: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  organizationId: z.string().min(1), // Usually injected from session context
});

// ===== Log Attendance Input Schema =====
// For creating new attendance records. organizationId is usually injected.
export const logAttendanceInputSchema = baseAttendanceSchema.omit({ organizationId: true });
export type LogAttendanceInput = z.infer<typeof logAttendanceInputSchema>;

// ===== Update Attendance Input Schema =====
// For updating existing records. All fields are optional except attendanceId.
export const updateAttendanceInputSchema = baseAttendanceSchema
  .omit({ organizationId: true }) // organizationId is not updatable / taken from context
  .partial() // Makes all fields optional
  .extend({
    attendanceId: z.string().min(1, { message: "Attendance ID is required" }),
  });
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceInputSchema>;

// ===== List Attendance Input Schema (For Organization) =====
export const listAttendanceInputSchema = z.object({
  employeeId: z.string().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: attendanceStatusSchema.optional(),
  page: z.number().min(1).default(1).optional(),
  pageSize: z.number().min(1).max(100).default(10).optional(),
  // organizationId: z.string().min(1), // This will be injected from session context
});
export type ListAttendanceInput = z.infer<typeof listAttendanceInputSchema>;

// ===== Attendance ID Schema =====
export const attendanceIdSchema = z.object({
  attendanceId: z.string().min(1, { message: "Attendance ID is required" }),
});
export type AttendanceIdInput = z.infer<typeof attendanceIdSchema>;


// ===== List Attendance For Employee Schema =====
// Specific schema for fetching an employee's own attendance.
export const listAttendanceForEmployeeSchema = z.object({
  employeeId: z.string().min(1, { message: "Employee ID is required" }), // Will be session user's employeeId
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type ListAttendanceForEmployeeInput = z.infer<typeof listAttendanceForEmployeeSchema>;
