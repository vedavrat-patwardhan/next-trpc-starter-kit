import { z } from 'zod';
import {
  createTRPCRouter,
  publicProcedure, // Will change to permissionProtectedProcedure
  permissionProtectedProcedure,
} from '~/app/server/trpc';
import { prisma } from '~/app/server/db';
import { PERMISSIONS } from '~/config/permissions';
import { TRPCError } from '@trpc/server';

export const userRouter = createTRPCRouter({
  list: permissionProtectedProcedure(PERMISSIONS.USER_VIEW)
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Organization ID missing from session.' });
      }

      const { page = 1, pageSize = 10 } = input || {};
      const skip = (page - 1) * pageSize;
      
      const whereClause = { organizationId }; // Filter by organizationId

      const [users, totalUsers] = await prisma.$transaction([
        prisma.user.findMany({
          skip,
          take: pageSize,
          where: whereClause,
          include: {
            role: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where: whereClause }),
      ]);
      return {
        users,
        totalUsers,
        totalPages: Math.ceil(totalUsers / pageSize),
        currentPage: page,
      };
    }),

  getById: publicProcedure // To be refined for admin or self
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Organization ID missing from session.' });
      }

      const userToView = await prisma.user.findUnique({
        where: { userId: input.id },
        include: {
          role: true,
        },
      });

      if (!userToView) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' });
      }

      // Permission check:
      // 1. User must belong to the same organization
      if (userToView.organizationId !== organizationId) {
         throw new TRPCError({ code: 'FORBIDDEN', message: 'You cannot view users from other organizations.' });
      }
      // 2. Admin (USER_VIEW) or the user themselves
      const hasUserViewPermission = ctx.session?.user.permissions?.includes(PERMISSIONS.USER_VIEW) ?? false;
      const isSelf = ctx.session?.user.id === input.id;

      if (!hasUserViewPermission && !isSelf) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to view this user.' });
      }
      
      return userToView;
    }),

  updateRole: permissionProtectedProcedure(PERMISSIONS.USER_MANAGE) 
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(), 
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Organization ID missing from session.' });
      }

      const userToUpdate = await prisma.user.findUnique({ where: { userId: input.userId } });
      if (!userToUpdate || userToUpdate.organizationId !== organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot update user from another organization.' });
      }
      
      const roleExists = await prisma.role.findUnique({ where: { roleId: input.roleId } });
      if (!roleExists) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid role ID.' });
      }

      return prisma.user.update({
        where: { userId: input.userId },
        data: { roleId: input.roleId },
        include: { role: true },
      });
    }),

  toggleActive: permissionProtectedProcedure(PERMISSIONS.USER_MANAGE)
    .input(
      z.object({
        userId: z.string(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Organization ID missing from session.' });
      }

      const userToUpdate = await prisma.user.findUnique({ where: { userId: input.userId } });
      if (!userToUpdate || userToUpdate.organizationId !== organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot update user from another organization.' });
      }

      return prisma.user.update({
        where: { userId: input.userId },
        data: { isActive: input.isActive },
        include: { role: true },
      });
    }),
});
