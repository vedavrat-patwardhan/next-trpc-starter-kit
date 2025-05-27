import { z } from 'zod';
import {
  createTRPCRouter,
  protectedProcedure,
  permissionProtectedProcedure,
} from '@/app/server/trpc';
import {
  runPayrollInputSchema,
  payrollIdSchema,
  listPayrollInputSchema,
  getPayslipInputSchema,
  listMyPayslipsInputSchema,
  emailPayslipInputSchema,
  approvePayrollRunInputSchema,
  // Assuming payslipLineItemSchema will be used internally for construction
} from '@/schemas/payroll.schema';
import { TRPCError } from '@trpc/server';
import { PERMISSIONS } from '@/config/permissions'; // Assuming this path is correct
import { Prisma } from '@prisma/client'; // For complex types if needed

export const payrollRouter = createTRPCRouter({
  initiateRun: permissionProtectedProcedure(PERMISSIONS.PAYROLL_RUN_MANAGE)
    .input(runPayrollInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { payPeriodStart, payPeriodEnd, employeeIds: specificEmployeeIds } = input;
      const organizationId = ctx.session.user.organizationId;

      // 1. Validate input: Check if a payroll run for this period already exists (non-draft)
      const existingRun = await ctx.prisma.payroll.findFirst({
        where: {
          organizationId,
          payPeriodStart,
          payPeriodEnd,
          status: { notIn: ['DRAFT', 'FAILED'] },
        },
      });
      if (existingRun) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A payroll run for period ${payPeriodStart.toLocaleDateString()} - ${payPeriodEnd.toLocaleDateString()} already exists with status ${existingRun.status}.`,
        });
      }

      // 2. Determine target employees
      let targetEmployeeIds: string[] = [];
      if (specificEmployeeIds && specificEmployeeIds.length > 0) {
        // Validate provided employee IDs belong to the organization
        const employeesInOrg = await ctx.prisma.employee.findMany({
          where: {
            employeeId: { in: specificEmployeeIds },
            organizationId,
            isActive: true, // Consider only active employees
          },
          select: { employeeId: true },
        });
        targetEmployeeIds = employeesInOrg.map(e => e.employeeId);
        if (targetEmployeeIds.length !== specificEmployeeIds.length) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Some provided employee IDs are invalid or not part of this organization.'})
        }
      } else {
        // Fetch all active employees in the organization
        const allActiveEmployees = await ctx.prisma.employee.findMany({
          where: { organizationId, isActive: true },
          select: { employeeId: true },
        });
        targetEmployeeIds = allActiveEmployees.map(e => e.employeeId);
      }

      if (targetEmployeeIds.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No employees found to process for this payroll run.' });
      }

      // 3. Create Payroll Record (Draft)
      const payrollRun = await ctx.prisma.payroll.create({
        data: {
          organizationId,
          payPeriodStart,
          payPeriodEnd,
          status: 'DRAFT', 
        },
      });

      // 4. Process each employee and create Payslip records (Simplified Placeholder Logic)
      const payslipPromises = targetEmployeeIds.map(async (employeeId) => {
        // Fetch SalaryAssignment (active for the period)
        // Fetch SalaryStructure and SalaryComponentMappings
        // Fetch approved LeaveApplications for LOP calculation
        // This is highly simplified. A real system needs complex logic here.
        
        // Placeholder LOP days
        const lopDays = Math.random() > 0.8 ? 1 : 0; // Random LOP for demo

        // Placeholder calculations
        const basicSalary = 5000; // Assume fetched from SalaryAssignment
        const hraPercentage = 0.4; // Assume from SalaryStructure/ComponentMapping
        const hra = basicSalary * hraPercentage;
        
        const earningsBreakdown = [
          { name: 'Basic Salary', type: 'EARNING', amount: basicSalary },
          { name: 'House Rent Allowance', type: 'EARNING', amount: hra },
        ];
        if (lopDays > 0) {
            earningsBreakdown.push({ name: 'LOP Deduction (Placeholder)', type: 'DEDUCTION', amount: (basicSalary/30) * lopDays});
        }

        const grossEarnings = earningsBreakdown.filter(i => i.type === 'EARNING').reduce((sum, item) => sum + item.amount, 0);
        
        const taxDeduction = grossEarnings * 0.1; // Simplified tax
        const deductionsBreakdown = [
          { name: 'Income Tax (Placeholder)', type: 'DEDUCTION', amount: taxDeduction },
        ];
        if (lopDays > 0) {
            deductionsBreakdown.push({ name: 'LOP Adjustment', type: 'DEDUCTION', amount: (basicSalary/30) * lopDays});
        }


        const totalDeductions = deductionsBreakdown.reduce((sum, item) => sum + item.amount, 0);
        const netPay = grossEarnings - totalDeductions;

        return ctx.prisma.payslip.create({
          data: {
            payrollId: payrollRun.payrollId,
            employeeId,
            organizationId, // Important for scoping payslips directly too
            earningsBreakdown: earningsBreakdown as unknown as Prisma.InputJsonValue,
            deductionsBreakdown: deductionsBreakdown as unknown as Prisma.InputJsonValue,
            grossEarnings,
            totalDeductions,
            netPay,
            summaryInfo: { totalWorkingDays: 30 - lopDays, lopDays } as Prisma.InputJsonValue,
          },
        });
      });

      await Promise.all(payslipPromises);

      return {
        payrollId: payrollRun.payrollId,
        status: payrollRun.status,
        message: `Payroll run initiated for ${targetEmployeeIds.length} employees.`,
      };
    }),

  getRunDetails: permissionProtectedProcedure(PERMISSIONS.PAYROLL_VIEW)
    .input(payrollIdSchema)
    .query(async ({ ctx, input }) => {
      const { payrollId } = input;
      const organizationId = ctx.session.user.organizationId;

      const payrollRun = await ctx.prisma.payroll.findUnique({
        where: { payrollId, organizationId },
        include: {
          payslips: {
            include: {
              employee: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      });

      if (!payrollRun) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payroll run not found.' });
      }
      return payrollRun;
    }),

  listRuns: permissionProtectedProcedure(PERMISSIONS.PAYROLL_VIEW)
    .input(listPayrollInputSchema)
    .query(async ({ ctx, input }) => {
      const { status, startDate, endDate, page = 1, pageSize = 10 } = input;
      const organizationId = ctx.session.user.organizationId;

      const whereClause: Prisma.PayrollWhereInput = { organizationId };
      if (status) whereClause.status = status;
      if (startDate) whereClause.payPeriodStart = { ...whereClause.payPeriodStart as object, gte: startDate };
      if (endDate) whereClause.payPeriodEnd = { ...whereClause.payPeriodEnd as object, lte: endDate };
      
      const totalRecords = await ctx.prisma.payroll.count({ where: whereClause });
      const payrollRuns = await ctx.prisma.payroll.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      
      return {
        items: payrollRuns,
        totalRecords,
        page,
        pageSize,
        totalPages: Math.ceil(totalRecords / pageSize),
      };
    }),

  getPayslipForEmployee: protectedProcedure
    .input(getPayslipInputSchema) // Using payslipId
    .query(async ({ ctx, input }) => {
      const { payslipId } = input;
      const sessionUser = ctx.session.user;

      const payslip = await ctx.prisma.payslip.findUnique({
        where: { payslipId },
        include: { 
            employee: { select: { firstName: true, lastName: true, email: true }},
            payroll: { select: { payPeriodStart: true, payPeriodEnd: true, paymentDate: true }}
        },
      });

      if (!payslip) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payslip not found.' });
      }

      // Security Check: User can only access their own payslip OR if they have global view permission
      if (payslip.employeeId !== sessionUser.employeeId && 
          !sessionUser.role?.permissions.includes(PERMISSIONS.PAYROLL_VIEW_ALL_PAYSLIPS)) { // New Permission
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to view this payslip.' });
      }
      // Ensure payslip belongs to the same organization as the session user
      if (payslip.organizationId !== sessionUser.organizationId) {
         throw new TRPCError({ code: 'FORBIDDEN', message: 'Payslip does not belong to your organization.' });
      }

      return payslip;
    }),
  
  listMyPayslips: protectedProcedure
    .input(listMyPayslipsInputSchema)
    .query(async ({ ctx, input }) => {
        const { page = 1, pageSize = 10, payPeriodStart, payPeriodEnd } = input;
        const employeeId = ctx.session.user.employeeId;
        const organizationId = ctx.session.user.organizationId;

        if (!employeeId) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Employee information not found in session.' });
        }

        const whereClause: Prisma.PayslipWhereInput = { 
            employeeId, 
            organizationId,
        };
        if (payPeriodStart || payPeriodEnd) {
            whereClause.payroll = {
                ...(payPeriodStart && { payPeriodStart: { gte: payPeriodStart } }),
                ...(payPeriodEnd && { payPeriodEnd: { lte: payPeriodEnd } }),
            };
        }
        
        const totalRecords = await ctx.prisma.payslip.count({ where: whereClause });
        const payslips = await ctx.prisma.payslip.findMany({
            where: whereClause,
            include: {
                payroll: {
                    select: { payPeriodStart: true, payPeriodEnd: true, status: true, paymentDate: true }
                }
            },
            orderBy: { payroll: { payPeriodStart: 'desc' } },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });

        return {
            items: payslips,
            totalRecords,
            page,
            pageSize,
            totalPages: Math.ceil(totalRecords / pageSize),
        };
    }),

  approveRun: permissionProtectedProcedure(PERMISSIONS.PAYROLL_APPROVE)
    .input(approvePayrollRunInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { payrollId } = input;
      const organizationId = ctx.session.user.organizationId;

      const payrollRun = await ctx.prisma.payroll.findFirst({
        where: { payrollId, organizationId, status: { in: ['DRAFT', 'PENDING_APPROVAL']} },
      });

      if (!payrollRun) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payroll run not found or not in an approvable state.' });
      }

      // Placeholder: In a real system, this might change status to 'PROCESSING'
      // and trigger background jobs for calculations, tax, bank transfers etc.
      // For now, let's assume it moves to 'COMPLETED' or a similar state.
      const updatedRun = await ctx.prisma.payroll.update({
        where: { payrollId },
        data: { status: 'COMPLETED', paymentDate: new Date() }, // Example: Mark as completed and set payment date
      });
      // Also update associated payslips if needed, e.g., their status or generated date.

      return { payrollId: updatedRun.payrollId, newStatus: updatedRun.status };
    }),

  emailPayslip: permissionProtectedProcedure(PERMISSIONS.PAYROLL_SEND_PAYSLIPS)
    .input(emailPayslipInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { payslipId } = input;
      const organizationId = ctx.session.user.organizationId;
      // 1. Fetch payslip and employee email
      const payslip = await ctx.prisma.payslip.findFirst({
        where: { payslipId, organizationId },
        include: { employee: { select: { email: true, firstName: true, lastName: true } } },
      });
      if (!payslip || !payslip.employee) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payslip or employee not found.' });
      }
      // 2. Generate PDF (external service or library - placeholder)
      const pdfUrl = payslip.fileUrl || `https://example.com/payslips/${payslipId}.pdf`; // Placeholder
      // 3. Send email (external service - placeholder)
      console.log(`Emailing payslip ${payslipId} to ${payslip.employee.email} (PDF: ${pdfUrl})`);
      // mailer.send({ to: payslip.employee.email, subject: "Your Payslip", body: `... find attached ... ${pdfUrl}`});
      return { success: true, message: `Payslip for ${payslip.employee.firstName} will be emailed.` };
    }),
});

// Note for permission: PERMISSIONS.PAYROLL_VIEW_ALL_PAYSLIPS is a new permission to consider.
// If an admin/HR needs to view any payslip via getPayslipForEmployee.
// Otherwise, getPayslipForEmployee is strictly for the employee owning the payslip.
// The current implementation of getPayslipForEmployee allows this dual access.
// The initiateRun has very simplified placeholder logic for actual payroll calculations.
// A full payroll system would involve many more steps, rules, and integrations.The Payroll tRPC router has been created at `src/app/server/routers/payroll.ts`.

Key implementations within the router:

-   **`initiateRun` Procedure**:
    -   Protected by `PERMISSIONS.PAYROLL_RUN_MANAGE`.
    -   Input: `runPayrollInputSchema` (`payPeriodStart`, `payPeriodEnd`, optional `employeeIds`).
    -   Validates that no conflicting run (non-DRAFT/FAILED) exists for the period.
    -   Determines target employees (all active if `employeeIds` is empty, or validates provided IDs).
    -   Creates a `Payroll` record with status 'DRAFT'.
    -   **Simplified Placeholder Logic for Payslips:** For each target employee:
        -   It *does not* yet fetch detailed `SalaryAssignment`, `SalaryStructure`, or `LeaveApplication` data for LOP. This complex calculation logic is deferred.
        -   Uses placeholder values for basic salary, HRA, and LOP days (randomly assigned for demo).
        -   Calculates `grossEarnings`, `totalDeductions` (placeholder tax + LOP), and `netPay`.
        -   Creates a `Payslip` record linked to the `Payroll` run, storing breakdowns and summary info as JSON.
    -   Returns the `payrollId`, `status`, and a message.

-   **`getRunDetails` Procedure**:
    -   Protected by `PERMISSIONS.PAYROLL_VIEW`.
    -   Input: `payrollIdSchema`.
    -   Fetches the `Payroll` run and its associated `Payslip` records, including employee details on each payslip.

-   **`listRuns` Procedure**:
    -   Protected by `PERMISSIONS.PAYROLL_VIEW`.
    -   Input: `listPayrollInputSchema` (filters for status, date range; pagination).
    -   Fetches `Payroll` runs with filtering and pagination.

-   **`getPayslipForEmployee` Procedure**:
    -   Uses `protectedProcedure`.
    -   Input: `getPayslipInputSchema` (containing `payslipId`).
    -   Fetches a specific `Payslip` including basic employee and payroll period details.
    -   **Security:** Ensures the logged-in user is the owner of the payslip OR has a new assumed permission `PERMISSIONS.PAYROLL_VIEW_ALL_PAYSLIPS`. Also checks if the payslip belongs to the user's organization.

-   **`listMyPayslips` Procedure**:
    -   Uses `protectedProcedure`.
    -   Input: `listMyPayslipsInputSchema` (pagination, optional date filters for pay period).
    -   Fetches all payslips for the logged-in employee (`ctx.session.user.employeeId`), with pagination and optional date filtering on the payroll period. Includes basic payroll run details.

-   **`approveRun` (Placeholder) Procedure**:
    -   Protected by `PERMISSIONS.PAYROLL_APPROVE`.
    -   Input: `payrollIdSchema`.
    -   Checks if the run exists and is in an approvable state (e.g., 'DRAFT', 'PENDING\_APPROVAL').
    -   **Placeholder Action:** Updates the `Payroll` status to 'COMPLETED' and sets a `paymentDate`. In a real system, this would trigger more complex processing.

-   **`emailPayslip` (Placeholder) Procedure**:
    -   Protected by `PERMISSIONS.PAYROLL_SEND_PAYSLIPS`.
    -   Input: `emailPayslipInputSchema` (containing `payslipId`).
    -   **Placeholder Action:** Fetches payslip and employee email, then logs a message. Actual PDF generation and emailing are external concerns.

**Notes and Assumptions:**
-   The implementation assumes the existence of permissions like `PERMISSIONS.PAYROLL_RUN_MANAGE`, `PERMISSIONS.PAYROLL_VIEW`, `PERMISSIONS.PAYROLL_APPROVE`, `PERMISSIONS.PAYROLL_SEND_PAYSLIPS`, and a new one `PERMISSIONS.PAYROLL_VIEW_ALL_PAYSLIPS` in `src/config/permissions.ts`.
-   The core payroll calculation logic within `initiateRun` is highly simplified and marked as a placeholder. A production system would require detailed implementation of earnings/deductions based on salary structures, tax rules, LOP, etc.
-   `organizationId` is consistently used for scoping data.
-   `Prisma.InputJsonValue` is used for JSON fields like `earningsBreakdown` to satisfy Prisma's type requirements.

Next, I will register this `payrollRouter` in the main `appRouter`.
