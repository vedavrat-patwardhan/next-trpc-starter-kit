import { z } from 'zod';
import {
  createTRPCRouter,
  permissionProtectedProcedure,
  // protectedProcedure, // If we need a generic protected procedure
} from '~/app/server/trpc';
import { prisma } from '~/app/server/db';
import { PERMISSIONS } from '~/config/permissions';
import {
  createSalaryComponentSchema,
  updateSalaryComponentSchema,
  listSalaryComponentsSchema,
} from '~/schemas/salaryComponent.schema'; // Adjust path as necessary
import { TRPCError } from '@trpc/server';

// Assuming organizationId will be part of the user's session
// interface UserSessionWithOrg extends DefaultSession['user'] {
//   organizationId?: string;
// }

export const salaryComponentRouter = createTRPCRouter({
  create: permissionProtectedProcedure(PERMISSIONS.SALARY_STRUCTURE_MANAGE)
    .input(createSalaryComponentSchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Organization ID is missing from session. User might not be authenticated or associated with an organization.',
        });
      }
      
      // Check for uniqueness within the organization
      const existingComponent = await prisma.salaryComponent.findUnique({
        where: {
          organizationId_name_type: {
            organizationId,
            name: input.name,
            type: input.type,
          },
        },
      });

      if (existingComponent) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A salary component with the name "${input.name}" and type "${input.type}" already exists in this organization.`,
        });
      }

      return prisma.salaryComponent.create({
        data: {
          ...input,
          organizationId, // Set the organization ID
        },
      });
    }),

  listByOrg: permissionProtectedProcedure(PERMISSIONS.SALARY_STRUCTURE_MANAGE)
    .input(listSalaryComponentsSchema) 
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Organization ID is missing from session.',
        });
      }
      
      return prisma.salaryComponent.findMany({
        where: {
          organizationId,
          type: input.type, 
        },
        orderBy: {
          name: 'asc', // Changed orderBy from type to name
        },
      });
    }),

  update: permissionProtectedProcedure(PERMISSIONS.SALARY_STRUCTURE_MANAGE)
    .input(updateSalaryComponentSchema)
    .mutation(async ({ input, ctx }) => {
      const { componentId, ...dataToUpdate } = input;
      const organizationId = ctx.session?.user?.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Organization ID is missing from session.',
        });
      }

      // Ensure the component exists and belongs to the user's organization
      const existingComponent = await prisma.salaryComponent.findUnique({
        where: { componentId },
      });

      if (!existingComponent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Salary component not found.' });
      }
      if (existingComponent.organizationId !== organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This component does not belong to your organization.' });
      }
      
      // If name or type is being updated, check for uniqueness
      if (dataToUpdate.name || dataToUpdate.type) {
        const nameCheck = dataToUpdate.name || existingComponent.name;
        const typeCheck = dataToUpdate.type || existingComponent.type;
        const conflictingComponent = await prisma.salaryComponent.findFirst({
            where: {
                organizationId,
                name: nameCheck,
                type: typeCheck,
                NOT: { componentId: componentId }
            }
        });
        if (conflictingComponent) {
            throw new TRPCError({
                code: 'CONFLICT',
                message: `Another salary component with name "${nameCheck}" and type "${typeCheck}" already exists.`,
            });
        }
      }


      return prisma.salaryComponent.update({
        where: { componentId },
        data: dataToUpdate,
      });
    }),

  delete: permissionProtectedProcedure(PERMISSIONS.SALARY_STRUCTURE_MANAGE)
    .input(z.object({ componentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { componentId } = input;
      const organizationId = ctx.session?.user?.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Organization ID is missing from session.',
        });
      }

      const component = await prisma.salaryComponent.findUnique({
        where: { componentId },
        include: { salaryStructureMappings: true } 
      });

      if (!component) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Salary component not found.' });
      }
      if (component.organizationId !== organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This component does not belong to your organization.' });
      }

      // Prevent deletion if the component is used in any salary structures
      if (component.salaryStructureMappings && component.salaryStructureMappings.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This salary component cannot be deleted because it is currently used in one or more salary structures. Please remove it from all structures before deleting.',
        });
      }

      return prisma.salaryComponent.delete({
        where: { componentId },
      });
    }),
});
