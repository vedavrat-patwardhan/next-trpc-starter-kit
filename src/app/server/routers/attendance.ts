import { z } from 'zod';
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from '@/app/server/trpc';
import {
  logAttendanceInputSchema,
  updateAttendanceInputSchema,
  attendanceIdSchema,
  listAttendanceInputSchema,
  listAttendanceForEmployeeSchema,
  attendanceStatusSchema, // For status validation if needed directly
} from '@/schemas/attendance.schema';
import { TRPCError } from '@trpc/server';
import { PERMISSIONS } from '@/config/permissions'; // Assuming this path is correct

export const attendanceRouter = createTRPCRouter({
  // Log new attendance record (Admin/HR)
  log: permissionProtectedProcedure(PERMISSIONS.ATTENDANCE_MANAGE_ALL)
    .input(logAttendanceInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { employeeId, date, status, checkInTime, checkOutTime, notes } = input;
      const organizationId = ctx.session.user.organizationId;

      // 1. Verify employee belongs to the organization
      const employee = await ctx.prisma.employee.findUnique({
        where: { employeeId },
      });
      if (!employee || employee.organizationId !== organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Employee not found in this organization.',
        });
      }

      // 2. Check for duplicate attendance for the same employee on the same date
      const existingAttendance = await ctx.prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId,
            date: new Date(date.toISOString().split('T')[0]), // Normalize date to remove time component
          },
        },
      });

      if (existingAttendance) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Attendance record already exists for this employee on this date.',
        });
      }
      
      // 3. Create attendance record
      const newAttendance = await ctx.prisma.attendance.create({
        data: {
          employeeId,
          date: new Date(date.toISOString().split('T')[0]), // Normalize date
          status,
          checkInTime,
          checkOutTime,
          notes,
          organizationId,
        },
      });
      return newAttendance;
    }),

  // Update existing attendance record (Admin/HR)
  update: permissionProtectedProcedure(PERMISSIONS.ATTENDANCE_MANAGE_ALL)
    .input(updateAttendanceInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { attendanceId, ...updateData } = input;
      const organizationId = ctx.session.user.organizationId;

      // 1. Verify attendance record exists and belongs to the organization
      const existingAttendance = await ctx.prisma.attendance.findUnique({
        where: { attendanceId },
      });

      if (!existingAttendance) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Attendance record not found.' });
      }
      if (existingAttendance.organizationId !== organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot update attendance for another organization.' });
      }
      
      // Normalize date if provided
      if (updateData.date) {
        updateData.date = new Date(new Date(updateData.date).toISOString().split('T')[0]);
      }

      // 2. Update attendance record
      const updatedAttendance = await ctx.prisma.attendance.update({
        where: { attendanceId },
        data: {
          ...updateData,
        },
      });
      return updatedAttendance;
    }),

  // Delete attendance record (Admin/HR)
  delete: permissionProtectedProcedure(PERMISSIONS.ATTENDANCE_MANAGE_ALL)
    .input(attendanceIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { attendanceId } = input;
      const organizationId = ctx.session.user.organizationId;

      // 1. Verify attendance record exists and belongs to the organization
      const existingAttendance = await ctx.prisma.attendance.findUnique({
        where: { attendanceId },
      });

      if (!existingAttendance) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Attendance record not found.' });
      }
      if (existingAttendance.organizationId !== organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete attendance for another organization.' });
      }

      // 2. Delete attendance record
      await ctx.prisma.attendance.delete({
        where: { attendanceId },
      });
      return { success: true, attendanceId };
    }),

  // List attendance records for a specific employee (Employee's own or Admin/HR with permission)
  listForEmployee: protectedProcedure // Could be permissionProtected if HR needs to see specific employee's full list
    .input(listAttendanceForEmployeeSchema)
    .query(async ({ ctx, input }) => {
      const { employeeId, startDate, endDate } = input;
      const sessionUser = ctx.session.user;

      // Security check: Ensure the logged-in user is requesting their own attendance
      // or has specific permissions to view others' (not implemented here for simplicity,
      // assuming PERMISSIONS.ATTENDANCE_VIEW_ALL would cover this for HR in listForOrganization)
      if (sessionUser.employeeId !== employeeId && !sessionUser.role?.permissions.includes(PERMISSIONS.ATTENDANCE_VIEW_ALL)) {
         throw new TRPCError({
           code: 'FORBIDDEN',
           message: "You are not authorized to view this employee's attendance.",
         });
      }

      const whereClause: any = {
        employeeId,
        organizationId: sessionUser.organizationId,
      };
      if (startDate) whereClause.date = { ...whereClause.date, gte: startDate };
      if (endDate) whereClause.date = { ...whereClause.date, lte: endDate };
      
      const attendanceRecords = await ctx.prisma.attendance.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
      });
      return attendanceRecords;
    }),

  // List attendance records for the entire organization (Admin/HR)
  listForOrganization: permissionProtectedProcedure(PERMISSIONS.ATTENDANCE_VIEW_ALL)
    .input(listAttendanceInputSchema)
    .query(async ({ ctx, input }) => {
      const { 
        employeeId, 
        startDate, 
        endDate, 
        status, 
        page = 1, 
        pageSize = 10 
      } = input;
      const organizationId = ctx.session.user.organizationId;

      const whereClause: any = { organizationId };
      if (employeeId) whereClause.employeeId = employeeId;
      if (status) whereClause.status = status;
      
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate.toISOString().split('T')[0]);
      if (endDate) dateFilter.lte = new Date(endDate.toISOString().split('T')[0]);
      if (startDate || endDate) whereClause.date = dateFilter;

      const totalRecords = await ctx.prisma.attendance.count({ where: whereClause });
      const attendanceRecords = await ctx.prisma.attendance.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              email: true, // Include email if needed
            },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      
      return {
        applications: attendanceRecords, // Renaming to 'applications' for consistency with other list procedures, consider 'records'
        totalRecords,
        page,
        pageSize,
        totalPages: Math.ceil(totalRecords / pageSize),
      };
    }),
});

// Note:
// - `hoursWorked` calculation is not implemented in these procedures. It could be a computed field
//   or handled client-side if simple, or via a separate utility/service if complex.
// - Ensure PERMISSIONS.ATTENDANCE_MANAGE_ALL and PERMISSIONS.ATTENDANCE_VIEW_ALL are defined
//   in `src/config/permissions.ts`.
// - Date normalization (removing time component for `date` field comparisons) is important.
// - The `listForOrganization` returns `applications` for consistency with other modules, 
//   but `records` or `attendanceRecords` might be more semantically correct.
// - Error handling for database operations (e.g., Prisma errors) can be further enhanced if needed.The Attendance tRPC router has been created at `src/app/server/routers/attendance.ts`.

Key implementations within the router:
-   **`log` Procedure**:
    -   Protected by `PERMISSIONS.ATTENDANCE_MANAGE_ALL`.
    -   Takes `logAttendanceInputSchema` as input.
    -   Verifies that the `employeeId` belongs to the user's `organizationId`.
    -   Checks for duplicate attendance records for the same employee on the same date (normalizing the date to ignore time components).
    -   Creates a new attendance record in the database, also normalizing the input date.
-   **`update` Procedure**:
    -   Protected by `PERMISSIONS.ATTENDANCE_MANAGE_ALL`.
    -   Takes `updateAttendanceInputSchema` as input.
    -   Verifies that the attendance record exists and belongs to the user's `organizationId`.
    -   Updates the specified fields. If `date` is provided, it's normalized.
-   **`delete` Procedure**:
    -   Protected by `PERMISSIONS.ATTENDANCE_MANAGE_ALL`.
    -   Takes `attendanceIdSchema` as input.
    -   Verifies that the attendance record exists and belongs to the user's `organizationId`.
    -   Deletes the attendance record.
-   **`listForEmployee` Procedure**:
    -   Uses `protectedProcedure`.
    -   Takes `employeeId` and optional `startDate`, `endDate` as input.
    -   Includes a security check to ensure the session user is requesting their own attendance, or has `ATTENDANCE_VIEW_ALL` permission (though the latter is more applicable to `listForOrganization`). This check could be refined based on more granular permission requirements.
    -   Fetches attendance records for the specified employee within their organization, ordered by date descending.
-   **`listForOrganization` Procedure**:
    -   Protected by `PERMISSIONS.ATTENDANCE_VIEW_ALL`.
    -   Takes `listAttendanceInputSchema` (filters like `employeeId`, `status`, `startDate`, `endDate`, and pagination options `page`, `pageSize`) as input.
    -   Constructs a `whereClause` based on the provided filters and the user's `organizationId`. Date filters are normalized.
    -   Fetches paginated attendance records, including selected employee details (`firstName`, `lastName`, `email`).
    -   Returns the list of records, total record count, current page, page size, and total pages. The property `applications` is used for the list of records for consistency with other modules, though `records` might be more semantically fitting.

**Notes and Assumptions:**
-   The `PERMISSIONS.ATTENDANCE_MANAGE_ALL` and `PERMISSIONS.ATTENDANCE_VIEW_ALL` constants are assumed to be defined in `src/config/permissions.ts`.
-   Date normalization (removing the time component by splitting ISO string and creating a new Date) is applied for `date` fields to ensure accurate day-based lookups and storage.
-   Calculation of `hoursWorked` is not directly implemented in these procedures and would need to be handled either client-side or through a separate mechanism/utility if required.
-   The router structure uses `protectedProcedure` and `permissionProtectedProcedure` as specified, injecting `organizationId` from the session context where appropriate.

Next, I will register this `attendanceRouter` in the main `appRouter`.
