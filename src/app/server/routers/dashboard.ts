import { z } from 'zod';
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from '@/app/server/trpc';
import { TRPCError } from '@trpc/server';
import { PERMISSIONS } from '@/config/permissions';
import { addDays, startOfDay, format } from 'date-fns'; // Ensure format is imported

export const dashboardRouter = createTRPCRouter({
  getKeyMetrics: permissionProtectedProcedure(PERMISSIONS.DASHBOARD_VIEW)
    .query(async ({ ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const today = startOfDay(new Date());
      const next30Days = addDays(today, 30);

      const totalActiveEmployees = await ctx.prisma.employee.count({
        where: { organizationId, isActive: true },
      });

      const pendingLeaveApplicationsCount = await ctx.prisma.leaveApplication.count({
        where: { organizationId, status: 'PENDING' },
      });

      const mostRecentPayroll = await ctx.prisma.payroll.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        select: { payrollId: true, status: true, payPeriodStart: true, payPeriodEnd: true, paymentDate: true },
      });

      const upcomingHolidaysCount = await ctx.prisma.holiday.count({
        where: {
          organizationId,
          date: { gte: today, lte: next30Days },
        },
      });

      return {
        totalActiveEmployees,
        pendingLeaveApplicationsCount,
        currentPayrollStatus: mostRecentPayroll
          ? {
              id: mostRecentPayroll.payrollId,
              status: mostRecentPayroll.status,
              period: `${format(mostRecentPayroll.payPeriodStart, "MMM d, yyyy")} - ${format(mostRecentPayroll.payPeriodEnd, "MMM d, yyyy")}`,
              paymentDate: mostRecentPayroll.paymentDate ? format(mostRecentPayroll.paymentDate, "MMM d, yyyy") : 'N/A',
            }
          : "No payrolls processed",
        upcomingHolidaysCount,
      };
    }),

  getUpcomingHolidaysList: permissionProtectedProcedure(PERMISSIONS.DASHBOARD_VIEW)
    .input(z.object({ limit: z.number().min(1).max(10).default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId;
      const today = startOfDay(new Date());
      const next30Days = addDays(today, 30); // Look ahead 30 days for upcoming holidays

      const holidays = await ctx.prisma.holiday.findMany({
        where: {
          organizationId,
          date: {
            gte: today,
            lte: next30Days,
          },
        },
        orderBy: { date: 'asc' },
        take: input?.limit || 5,
        select: { name: true, date: true },
      });
      return holidays.map(h => ({ ...h, date: format(h.date, "MMM d, yyyy") }));
    }),

  getRecentLeaveApplications: permissionProtectedProcedure(PERMISSIONS.DASHBOARD_VIEW)
    .input(z.object({ limit: z.number().min(1).max(10).default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId;
      const applications = await ctx.prisma.leaveApplication.findMany({
        where: {
          organizationId,
          // Optional: Filter by specific statuses if desired
          // status: { in: ['PENDING', 'APPROVED'] } 
        },
        orderBy: { appliedOn: 'desc' },
        take: input?.limit || 5,
        include: {
          employee: {
            select: { firstName: true, lastName: true },
          },
          leaveType: {
            select: { name: true },
          },
        },
      });
      return applications.map(app => ({
        id: app.applicationId,
        employeeName: `${app.employee.firstName || ''} ${app.employee.lastName || ''}`.trim(),
        leaveTypeName: app.leaveType.name,
        status: app.status,
        appliedOn: format(app.appliedOn, "MMM d, yyyy"),
        startDate: format(app.startDate, "MMM d, yyyy"),
        endDate: format(app.endDate, "MMM d, yyyy"),
      }));
    }),

  getRecentlyHiredEmployees: permissionProtectedProcedure(PERMISSIONS.DASHBOARD_VIEW)
    .input(z.object({ limit: z.number().min(1).max(10).default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizationId;
      const employees = await ctx.prisma.employee.findMany({
        where: {
          organizationId,
          isActive: true, // Typically, you'd want active recently hired employees
        },
        orderBy: { hireDate: 'desc' },
        take: input?.limit || 5,
        select: {
          employeeId: true,
          firstName: true,
          lastName: true,
          jobTitle: true,
          hireDate: true,
        },
      });
      return employees.map(emp => ({
        id: emp.employeeId,
        name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        jobTitle: emp.jobTitle,
        hireDate: format(emp.hireDate, "MMM d, yyyy"),
      }));
    }),
});

// Removed unused formatDate helper as date-fns format is directly used.
