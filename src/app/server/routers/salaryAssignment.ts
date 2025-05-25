import { z } from 'zod';
import {
  createTRPCRouter,
  permissionProtectedProcedure,
  publicProcedure, // For self-view cases with custom logic
} from '~/app/server/trpc';
import { prisma } from '~/app/server/db';
import { PERMISSIONS } from '~/config/permissions';
import {
  createSalaryAssignmentSchema,
  updateSalaryAssignmentSchema,
  listEmployeeAssignmentsSchema,
} from '~/schemas/salaryAssignment.schema';
import { TRPCError } from '@trpc/server';

export const salaryAssignmentRouter = createTRPCRouter({
  assignStructureToEmployee: permissionProtectedProcedure(PERMISSIONS.SALARY_ASSIGN_MANAGE)
    .input(createSalaryAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;

      const employee = await prisma.employee.findUnique({
        where: { employeeId: input.employeeId },
      });
      if (!employee || employee.organizationId !== organizationId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Employee not found or not in your organization.' });
      }

      const structure = await prisma.salaryStructure.findUnique({
        where: { structureId: input.structureId },
      });
      if (!structure || structure.organizationId !== organizationId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Salary structure not found or not in your organization.' });
      }

      // Transaction to deactivate old assignments and create the new one
      return prisma.$transaction(async (tx) => {
        await tx.salaryAssignment.updateMany({
          where: {
            employeeId: input.employeeId,
            organizationId: organizationId,
            isActive: true,
          },
          data: { isActive: false },
        });

        const newAssignment = await tx.salaryAssignment.create({
          data: {
            ...input,
            organizationId,
            isActive: true,
          },
        });
        return newAssignment;
      });
    }),

  getAssignmentsForEmployee: publicProcedure // Custom permission check inside
    .input(listEmployeeAssignmentsSchema)
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const requestingUserId = ctx.session.user.id;

      const employee = await prisma.employee.findUnique({
        where: { employeeId: input.employeeId },
        include: { user: true } // To check if the employee is the user themselves
      });

      if (!employee || employee.organizationId !== organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found or not in your organization.' });
      }

      const canManage = ctx.session.user.permissions.includes(PERMISSIONS.SALARY_ASSIGN_MANAGE);
      const isSelf = employee.user?.userId === requestingUserId && ctx.session.user.permissions.includes(PERMISSIONS.PAYSLIP_VIEW_SELF); // Assuming similar permission for viewing own salary info

      if (!canManage && !isSelf) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to view these assignments.' });
      }

      return prisma.salaryAssignment.findMany({
        where: {
          employeeId: input.employeeId,
          organizationId: organizationId,
        },
        include: {
          salaryStructure: true, // Include details of the assigned structure
        },
        orderBy: { effectiveDate: 'desc' },
      });
    }),
  
  getActiveAssignmentForEmployee: publicProcedure // Custom permission check inside
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const requestingUserId = ctx.session.user.id;

      const employee = await prisma.employee.findUnique({
        where: { employeeId: input.employeeId },
        include: { user: true }
      });

      if (!employee || employee.organizationId !== organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found or not in your organization.' });
      }

      const canManage = ctx.session.user.permissions.includes(PERMISSIONS.SALARY_ASSIGN_MANAGE);
      // Assuming users can view their own active assignment details
      const isSelf = employee.user?.userId === requestingUserId && ctx.session.user.permissions.includes(PERMISSIONS.PAYSLIP_VIEW_SELF);


      if (!canManage && !isSelf) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to view this assignment.' });
      }
      
      return prisma.salaryAssignment.findFirst({
        where: {
          employeeId: input.employeeId,
          organizationId: organizationId,
          isActive: true,
        },
        include: {
          salaryStructure: {
            include: {
              componentMappings: {
                include: {
                  salaryComponent: true,
                },
              },
            },
          },
        },
      });
    }),

  updateAssignment: permissionProtectedProcedure(PERMISSIONS.SALARY_ASSIGN_MANAGE)
    .input(updateSalaryAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const { assignmentId, ...dataToUpdate } = input;

      const assignment = await prisma.salaryAssignment.findUnique({
        where: { assignmentId },
      });
      if (!assignment || assignment.organizationId !== organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assignment not found or not in your organization.' });
      }

      // If this assignment is being set to active, ensure others for the same employee are deactivated
      if (dataToUpdate.isActive === true && assignment.isActive === false) {
        await prisma.salaryAssignment.updateMany({
          where: {
            employeeId: assignment.employeeId,
            organizationId: organizationId,
            isActive: true,
            NOT: { assignmentId: assignmentId } // Don't deactivate the one we are about to activate
          },
          data: { isActive: false },
        });
      }
      
      return prisma.salaryAssignment.update({
        where: { assignmentId },
        data: {
          ...dataToUpdate,
        },
      });
    }),

  deleteAssignment: permissionProtectedProcedure(PERMISSIONS.SALARY_ASSIGN_MANAGE)
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const { assignmentId } = input;

      const assignment = await prisma.salaryAssignment.findUnique({
        where: { assignmentId },
      });
      if (!assignment || assignment.organizationId !== organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assignment not found or not in your organization.' });
      }
      
      // TODO: Add check if assignment was used in a processed payroll. If so, prevent deletion or allow only deactivation.
      // For now, we'll allow deletion. If it was active, this might leave an employee without an active assignment.
      // Consider deactivating instead:
      // return prisma.salaryAssignment.update({ where: { assignmentId }, data: { isActive: false } });
      
      await prisma.salaryAssignment.delete({
        where: { assignmentId },
      });
      return { success: true, message: 'Salary assignment deleted successfully.' };
    }),
});
