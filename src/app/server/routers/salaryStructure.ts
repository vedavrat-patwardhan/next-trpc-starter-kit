import { z } from 'zod';
import {
  createTRPCRouter,
  permissionProtectedProcedure,
  // protectedProcedure, // If we need a generic protected procedure
} from '~/app/server/trpc';
import { prisma } from '~/app/server/db';
import { PERMISSIONS } from '~/config/permissions';
import {
  createSalaryStructureSchema,
  updateSalaryStructureSchema,
  listSalaryStructuresSchema,
} from '~/schemas/salaryStructure.schema'; // Adjust path as necessary
import { TRPCError } from '@trpc/server';

// Assuming organizationId will be part of the user's session
// interface UserSessionWithOrg extends DefaultSession['user'] {
//   organizationId?: string;
// }

export const salaryStructureRouter = createTRPCRouter({
  create: permissionProtectedProcedure(PERMISSIONS.SALARY_STRUCTURE_MANAGE)
    .input(createSalaryStructureSchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Organization ID is missing from session.',
        });
      }

      const { name, description, components } = input;

      // Check for uniqueness of structure name within the organization
      const existingStructure = await prisma.salaryStructure.findUnique({
        where: {
          organizationId_name: {
            organizationId,
            name,
          },
        },
      });
      if (existingStructure) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A salary structure with the name "${name}" already exists in this organization.`,
        });
      }
      
      // Verify all componentIds belong to the same organization
      const componentIds = components.map(c => c.componentId);
      const dbComponents = await prisma.salaryComponent.findMany({
        where: {
          componentId: { in: componentIds },
          organizationId: organizationId,
        },
      });

      if (dbComponents.length !== componentIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more salary components are invalid or do not belong to this organization.',
        });
      }

      return prisma.$transaction(async (tx) => {
        const newStructure = await tx.salaryStructure.create({
          data: {
            name,
            description,
            organizationId,
            isActive: true, // Default to active
          },
        });

        const componentMappingsData = components.map((comp) => ({
          structureId: newStructure.structureId,
          componentId: comp.componentId,
          definedValue: comp.definedValue,
          percentageOfComponentId: comp.percentageOfComponentId,
        }));

        await tx.salaryComponentMapping.createMany({
          data: componentMappingsData,
        });

        return tx.salaryStructure.findUnique({
            where: { structureId: newStructure.structureId },
            include: { componentMappings: { include: { salaryComponent: true } } }
        });
      });
    }),

  listByOrg: permissionProtectedProcedure(PERMISSIONS.SALARY_STRUCTURE_MANAGE)
    .input(listSalaryStructuresSchema)
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Organization ID is missing from session.',
        });
      }

      return prisma.salaryStructure.findMany({
        where: {
          organizationId,
          isActive: input.isActive, // Optional filter by active status
        },
        include: {
          componentMappings: {
            include: {
              salaryComponent: true, // Include component details in the list
            },
            orderBy: { salaryComponent: { type: 'asc' } } // Example ordering
          },
          _count: {
            select: { employeeAssignments: true } // Count how many employees are assigned
          }
        },
        orderBy: { name: 'asc' },
      });
    }),

  getById: permissionProtectedProcedure(PERMISSIONS.SALARY_STRUCTURE_MANAGE) // Or view permission
    .input(z.object({ structureId: z.string() }))
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session?.user?.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Organization ID is missing from session.',
        });
      }
      
      const structure = await prisma.salaryStructure.findUnique({
        where: { structureId: input.structureId },
        include: {
          componentMappings: {
            include: {
              salaryComponent: true,
            },
            orderBy: { salaryComponent: { type: 'asc' } }
          },
        },
      });

      if (!structure) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Salary structure not found.' });
      }
      if (structure.organizationId !== organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This structure does not belong to your organization.' });
      }
      return structure;
    }),

  update: permissionProtectedProcedure(PERMISSIONS.SALARY_STRUCTURE_MANAGE)
    .input(updateSalaryStructureSchema)
    .mutation(async ({ input, ctx }) => {
      const { structureId, components, ...structureData } = input;
      const organizationId = ctx.session?.user?.organizationId;

      if (!organizationId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Organization ID is missing from session.',
        });
      }

      const existingStructure = await prisma.salaryStructure.findUnique({
        where: { structureId },
      });

      if (!existingStructure) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Salary structure not found.' });
      }
      if (existingStructure.organizationId !== organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This structure does not belong to your organization.' });
      }
      
      // If name is being updated, check for uniqueness within the organization
      if (structureData.name && structureData.name !== existingStructure.name) {
        const conflictingStructure = await prisma.salaryStructure.findFirst({
            where: {
                organizationId,
                name: structureData.name,
                NOT: { structureId: structureId }
            }
        });
        if (conflictingStructure) {
            throw new TRPCError({
                code: 'CONFLICT',
                message: `Another salary structure with name "${structureData.name}" already exists.`,
            });
        }
      }

      return prisma.$transaction(async (tx) => {
        await tx.salaryStructure.update({
          where: { structureId },
          data: {
            ...structureData,
          },
        });

        if (components) {
          // Verify all componentIds belong to the same organization
          const componentIds = components.map(c => c.componentId);
          if (componentIds.length > 0) { // only check if components are provided
            const dbComponents = await tx.salaryComponent.findMany({
              where: {
                componentId: { in: componentIds },
                organizationId: organizationId,
              },
              select: { componentId: true } // only select id
            });
            if (dbComponents.length !== componentIds.length) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'One or more salary components in the update are invalid or do not belong to this organization.',
              });
            }
          }
          
          // Clear existing mappings and create new ones
          await tx.salaryComponentMapping.deleteMany({
            where: { structureId },
          });

          if (components.length > 0) {
            const componentMappingsData = components.map((comp) => ({
              structureId: structureId,
              componentId: comp.componentId,
              definedValue: comp.definedValue,
              percentageOfComponentId: comp.percentageOfComponentId,
            }));
            await tx.salaryComponentMapping.createMany({
              data: componentMappingsData,
            });
          }
        }
        
        return tx.salaryStructure.findUnique({
            where: { structureId: structureId },
            include: { componentMappings: { include: { salaryComponent: true } } }
        });
      });
    }),

  delete: permissionProtectedProcedure(PERMISSIONS.SALARY_STRUCTURE_MANAGE)
    .input(z.object({ structureId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { structureId } = input;
      const organizationId = ctx.session?.user?.organizationId;

       if (!organizationId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Organization ID is missing from session.',
        });
      }

      const structure = await prisma.salaryStructure.findUnique({
        where: { structureId },
        include: { employeeAssignments: true } 
      });

      if (!structure) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Salary structure not found.' });
      }
      if (structure.organizationId !== organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This structure does not belong to your organization.' });
      }

      // Prevent deletion if the structure is assigned to any employees
      if (structure.employeeAssignments && structure.employeeAssignments.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This salary structure cannot be deleted because it is currently assigned to one or more employees. Please unassign it from all employees before deleting.',
        });
      }
      
      // In a transaction, delete mappings first, then the structure
      return prisma.$transaction(async (tx) => {
        await tx.salaryComponentMapping.deleteMany({
            where: { structureId: structureId }
        });
        await tx.salaryStructure.delete({
            where: { structureId: structureId }
        });
        return { success: true, message: 'Salary structure deleted successfully.' };
      });
    }),
});
