import { z } from 'zod';
import {
  createTRPCRouter,
  permissionProtectedProcedure,
  protectedProcedure, // For self-actions where employeeId is key
} from '~/app/server/trpc';
import { prisma } from '~/app/server/db';
import { PERMISSIONS } from '~/config/permissions';
import {
  createLeaveApplicationSchema,
  updateLeaveApplicationStatusSchema,
  listLeaveApplicationsForOrgSchema,
} from '~/schemas/leave.schema';
import { TRPCError } from '@trpc/server';
import { addDays, differenceInDays, isWithinInterval, parseISO } from 'date-fns';


export const leaveApplicationRouter = createTRPCRouter({
  applyForLeave: protectedProcedure // Uses session.user.employeeId
    .input(createLeaveApplicationSchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const employeeId = ctx.session.user.employeeId;

      if (!employeeId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'User is not linked to an employee profile.' });
      }
      
      // Verify LeaveType belongs to the organization
      const leaveType = await prisma.leaveType.findFirst({
        where: { leaveTypeId: input.leaveTypeId, organizationId }
      });
      if(!leaveType){
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid leave type selected.' });
      }

      // Check for overlapping leave dates for the same employee
      const overlappingLeaves = await prisma.leaveApplication.findMany({
        where: {
          employeeId,
          organizationId,
          status: { notIn: ['REJECTED', 'CANCELLED'] }, // Consider only active/pending leaves
          OR: [
            { startDate: { lte: input.endDate }, endDate: { gte: input.startDate } }, // Overlaps
          ],
        },
      });

      if (overlappingLeaves.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'There is an overlapping leave application for the selected dates.',
        });
      }
      
      // Basic leave balance check (V1 - does not sum up days, just checks against defaultDays for now)
      // For a real system, this needs to sum approved leave days for the year and compare.
      const requestedDays = differenceInDays(input.endDate, input.startDate) + 1;
      if (requestedDays <= 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'End date must be after start date.'});
      }
      // V1 balance check:
      // const leaveTypeDetails = await prisma.leaveType.findUnique({ where: { leaveTypeId: input.leaveTypeId }});
      // if (leaveTypeDetails && requestedDays > leaveTypeDetails.defaultDays) {
      //   throw new TRPCError({ code: 'BAD_REQUEST', message: `Requested days (${requestedDays}) exceed available balance (${leaveTypeDetails.defaultDays}) for ${leaveTypeDetails.name}.`});
      // }


      return prisma.leaveApplication.create({
        data: {
          ...input,
          employeeId,
          organizationId,
          status: 'PENDING', // Default status
        },
      });
    }),

  listForEmployee: protectedProcedure // Uses session.user.employeeId or checks permission
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const requestingUserEmployeeId = ctx.session.user.employeeId;
      const canViewAll = ctx.session.user.permissions.includes(PERMISSIONS.LEAVE_VIEW_ALL_APPLICATIONS);

      if (!canViewAll && input.employeeId !== requestingUserEmployeeId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to view these leave applications.' });
      }
      
      // Ensure target employee is in the same org
      const targetEmployee = await prisma.employee.findFirst({ where: { employeeId: input.employeeId, organizationId }});
      if(!targetEmployee) {
         throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found in your organization.' });
      }


      return prisma.leaveApplication.findMany({
        where: {
          employeeId: input.employeeId,
          organizationId,
        },
        include: { 
            leaveType: true,
            employee: { select: { firstName: true, lastName: true }}
        },
        orderBy: { appliedOn: 'desc' },
      });
    }),

  listForOrganization: permissionProtectedProcedure(PERMISSIONS.LEAVE_VIEW_ALL_APPLICATIONS)
    .input(listLeaveApplicationsForOrgSchema)
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const { status, startDate, endDate, page = 1, pageSize = 10 } = input;
      const skip = (page - 1) * pageSize;

      const whereClause: any = { organizationId };
      if (status) whereClause.status = status;
      if (startDate && endDate) {
        whereClause.OR = [ // Overlapping or within range
            { startDate: { lte: endDate }, endDate: { gte: startDate } }
        ];
      } else if (startDate) {
        whereClause.startDate = { gte: startDate };
      } else if (endDate) {
        whereClause.endDate = { lte: endDate };
      }
      
      const [applications, totalApplications] = await prisma.$transaction([
        prisma.leaveApplication.findMany({
          where: whereClause,
          include: {
            employee: { select: { firstName: true, lastName: true, email: true } },
            leaveType: true,
          },
          orderBy: { appliedOn: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.leaveApplication.count({ where: whereClause })
      ]);
      
      return {
        applications,
        totalApplications,
        totalPages: Math.ceil(totalApplications / pageSize),
        currentPage: page,
      };
    }),

  updateStatus: permissionProtectedProcedure(PERMISSIONS.LEAVE_APPROVE)
    .input(updateLeaveApplicationStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const approverUserId = ctx.session.user.id;
      const { applicationId, status, comments } = input;

      const application = await prisma.leaveApplication.findUnique({
        where: { applicationId },
      });

      if (!application || application.organizationId !== organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Leave application not found or not in your organization.' });
      }
      if (application.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Only PENDING applications can be ${status.toLowerCase()}d.` });
      }

      return prisma.leaveApplication.update({
        where: { applicationId },
        data: {
          status,
          comments,
          approvedById: approverUserId,
        },
      });
    }),

  cancelApplication: protectedProcedure // User cancelling their own
    .input(z.object({ applicationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const employeeId = ctx.session.user.employeeId;
      const { applicationId } = input;

      if (!employeeId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'User is not linked to an employee profile.' });
      }

      const application = await prisma.leaveApplication.findUnique({
        where: { applicationId },
      });

      if (!application || application.organizationId !== organizationId || application.employeeId !== employeeId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Leave application not found or you do not own it.' });
      }
      if (application.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only PENDING applications can be cancelled.' });
      }

      return prisma.leaveApplication.update({
        where: { applicationId },
        data: { status: 'CANCELLED' },
      });
    }),
    
  // Simplified V1 - does not account for accrual policies or complex carry-over.
  // Assumes leave balances are primarily based on LeaveType.defaultDays minus approved applications for a given year.
  getLeaveBalance: protectedProcedure
    .input(z.object({ 
        employeeId: z.string(), 
        leaveTypeId: z.string(), 
        year: z.number().int().min(new Date().getFullYear() - 5).max(new Date().getFullYear() + 5) // Reasonable year range
    }))
    .query(async ({input, ctx}) => {
        const organizationId = ctx.session.user.organizationId;
        const requestingUserEmployeeId = ctx.session.user.employeeId;
        const canViewAll = ctx.session.user.permissions.includes(PERMISSIONS.LEAVE_VIEW_ALL_APPLICATIONS);

        if (!canViewAll && input.employeeId !== requestingUserEmployeeId) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to view this leave balance.' });
        }

        const employee = await prisma.employee.findFirst({ where: { employeeId: input.employeeId, organizationId }});
        if(!employee) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found in your organization.' });
        }
        
        const leaveType = await prisma.leaveType.findFirst({
            where: { leaveTypeId: input.leaveTypeId, organizationId }
        });
        if (!leaveType) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Leave type not found.' });
        }

        const yearStartDate = new Date(input.year, 0, 1);
        const yearEndDate = new Date(input.year, 11, 31);

        const approvedLeaves = await prisma.leaveApplication.findMany({
            where: {
                employeeId: input.employeeId,
                leaveTypeId: input.leaveTypeId,
                organizationId,
                status: 'APPROVED',
                // Consider only leaves within the specified year.
                // This logic might need to be more sophisticated depending on how start/end dates are handled for multi-year leaves.
                OR: [
                    { startDate: { gte: yearStartDate, lte: yearEndDate } },
                    { endDate: { gte: yearStartDate, lte: yearEndDate } },
                    { startDate: { lt: yearStartDate }, endDate: { gt: yearEndDate } } // Spans the whole year
                ]
            }
        });

        let daysTaken = 0;
        approvedLeaves.forEach(app => {
            const start = app.startDate > yearStartDate ? app.startDate : yearStartDate;
            const end = app.endDate < yearEndDate ? app.endDate : yearEndDate;
            daysTaken += differenceInDays(addDays(end,1), start); // +1 to include end date
        });
        
        const availableDays = leaveType.defaultDays - daysTaken;

        return {
            leaveTypeName: leaveType.name,
            allocatedDays: leaveType.defaultDays,
            daysTaken,
            availableDays,
            year: input.year
        };
    }),
});
