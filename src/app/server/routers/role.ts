import { z } from 'zod';
import { createTRPCRouter, publicProcedure, permissionProtectedProcedure } from '~/app/server/trpc';
import { prisma } from '~/app/server/db';
import { PERMISSIONS } from '~/config/permissions';

export const roleRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.role.findUnique({
        where: { roleId: input.id },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    }),

  create: permissionProtectedProcedure(PERMISSIONS.ROLE_MANAGE)
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        permissionIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const { name, description, permissionIds } = input;

      return prisma.$transaction(async (tx) => {
        const role = await tx.role.create({
          data: {
            name,
            description,
          },
        });

        if (permissionIds.length > 0) {
          await tx.rolePermissionMapping.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId: role.roleId,
              permissionId,
            })),
          });
        }
        // Return the role with its permissions
        return tx.role.findUnique({
          where: { roleId: role.roleId },
          include: {
            permissions: { include: { permission: true } },
          },
        });
      });
    }),

  update: permissionProtectedProcedure(PERMISSIONS.ROLE_MANAGE)
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        permissionIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, name, description, permissionIds } = input;

      return prisma.$transaction(async (tx) => {
        const updatedRole = await tx.role.update({
          where: { roleId: id },
          data: {
            name,
            description,
          },
        });

        if (permissionIds) {
          // Clear existing permissions
          await tx.rolePermissionMapping.deleteMany({
            where: { roleId: id },
          });

          // Add new permissions
          if (permissionIds.length > 0) {
            await tx.rolePermissionMapping.createMany({
              data: permissionIds.map((permissionId) => ({
                roleId: id,
                permissionId,
              })),
            });
          }
        }
        
        // Return the role with its permissions
        return tx.role.findUnique({
          where: { roleId: updatedRole.roleId },
          include: {
            permissions: { include: { permission: true } },
          },
        });
      });
    }),
});
