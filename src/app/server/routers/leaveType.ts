import { z } from 'zod';
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from '~/app/server/trpc';
import { prisma } from '~/app/server/db';
import { PERMISSIONS } from '~/config/permissions';
import {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
} from '~/schemas/leave.schema';
import { TRPCError } from '@trpc/server';

export const leaveTypeRouter = createTRPCRouter({
  create: permissionProtectedProcedure(PERMISSIONS.LEAVE_TYPE_MANAGE)
    .input(createLeaveTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;

      // Check for uniqueness within the organization
      const existingLeaveType = await prisma.leaveType.findUnique({
        where: {
          organizationId_name: {
            organizationId,
            name: input.name,
          },
        },
      });
      if (existingLeaveType) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A leave type with the name "${input.name}" already exists in this organization.`,
        });
      }

      return prisma.leaveType.create({
        data: {
          ...input,
          organizationId,
        },
      });
    }),

  listByOrg: permissionProtectedProcedure(PERMISSIONS.LEAVE_TYPE_MANAGE) // Or a more general view permission
    .query(async ({ ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      return prisma.leaveType.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
      });
    }),

  update: permissionProtectedProcedure(PERMISSIONS.LEAVE_TYPE_MANAGE)
    .input(updateLeaveTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const { leaveTypeId, ...dataToUpdate } = input;

      const existingLeaveType = await prisma.leaveType.findUnique({
        where: { leaveTypeId },
      });
      if (!existingLeaveType || existingLeaveType.organizationId !== organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Leave type not found or not in your organization.' });
      }

      // If name is being updated, check for uniqueness
      if (dataToUpdate.name && dataToUpdate.name !== existingLeaveType.name) {
        const conflictingName = await prisma.leaveType.findFirst({
          where: {
            name: dataToUpdate.name,
            organizationId,
            NOT: { leaveTypeId },
          },
        });
        if (conflictingName) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Another leave type with the name "${dataToUpdate.name}" already exists.`,
          });
        }
      }

      return prisma.leaveType.update({
        where: { leaveTypeId },
        data: dataToUpdate,
      });
    }),

  delete: permissionProtectedProcedure(PERMISSIONS.LEAVE_TYPE_MANAGE)
    .input(z.object({ leaveTypeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const { leaveTypeId } = input;

      const leaveType = await prisma.leaveType.findUnique({
        where: { leaveTypeId },
        include: { leaveApplications: { take: 1 } }, // Check if used
      });

      if (!leaveType || leaveType.organizationId !== organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Leave type not found or not in your organization.' });
      }

      if (leaveType.leaveApplications.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This leave type cannot be deleted because it is used in existing leave applications.',
        });
      }

      return prisma.leaveType.delete({
        where: { leaveTypeId },
      });
    }),
});
