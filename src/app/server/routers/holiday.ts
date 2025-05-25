import { z } from 'zod';
import {
  createTRPCRouter,
  permissionProtectedProcedure,
} from '~/app/server/trpc';
import { prisma } from '~/app/server/db';
import { PERMISSIONS } from '~/config/permissions';
import {
  createHolidaySchema,
  updateHolidaySchema,
  listHolidaysByOrgSchema,
} from '~/schemas/leave.schema';
import { TRPCError } from '@trpc/server';
import { startOfYear, endOfYear } from 'date-fns';

export const holidayRouter = createTRPCRouter({
  create: permissionProtectedProcedure(PERMISSIONS.LEAVE_TYPE_MANAGE) // Or HOLIDAY_MANAGE
    .input(createHolidaySchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;

      // Check for uniqueness of holiday date within the organization
      const existingHolidayOnDate = await prisma.holiday.findUnique({
        where: {
          organizationId_date: {
            organizationId,
            date: input.date,
          },
        },
      });
      if (existingHolidayOnDate) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A holiday on date "${input.date.toDateString()}" already exists in this organization.`,
        });
      }

      return prisma.holiday.create({
        data: {
          ...input,
          organizationId,
        },
      });
    }),

  listByOrg: permissionProtectedProcedure(PERMISSIONS.LEAVE_TYPE_MANAGE) // Or a general view/org setting view permission
    .input(listHolidaysByOrgSchema)
    .query(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const { year } = input;

      const startDate = startOfYear(new Date(year, 0, 1));
      const endDate = endOfYear(new Date(year, 0, 1));
      
      return prisma.holiday.findMany({
        where: { 
          organizationId,
          date: {
            gte: startDate,
            lte: endDate,
          }
        },
        orderBy: { date: 'asc' },
      });
    }),

  update: permissionProtectedProcedure(PERMISSIONS.LEAVE_TYPE_MANAGE) // Or HOLIDAY_MANAGE
    .input(updateHolidaySchema)
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const { holidayId, ...dataToUpdate } = input;

      const existingHoliday = await prisma.holiday.findUnique({
        where: { holidayId },
      });
      if (!existingHoliday || existingHoliday.organizationId !== organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Holiday not found or not in your organization.' });
      }

      // If date is being updated, check for uniqueness
      if (dataToUpdate.date && dataToUpdate.date.getTime() !== existingHoliday.date.getTime()) {
        const conflictingDate = await prisma.holiday.findFirst({
          where: {
            date: dataToUpdate.date,
            organizationId,
            NOT: { holidayId },
          },
        });
        if (conflictingDate) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Another holiday on date "${dataToUpdate.date.toDateString()}" already exists.`,
          });
        }
      }

      return prisma.holiday.update({
        where: { holidayId },
        data: dataToUpdate,
      });
    }),

  delete: permissionProtectedProcedure(PERMISSIONS.LEAVE_TYPE_MANAGE) // Or HOLIDAY_MANAGE
    .input(z.object({ holidayId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const organizationId = ctx.session.user.organizationId;
      const { holidayId } = input;

      const holiday = await prisma.holiday.findUnique({
        where: { holidayId },
      });

      if (!holiday || holiday.organizationId !== organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Holiday not found or not in your organization.' });
      }

      // No dependent data check needed for holidays as per current schema
      return prisma.holiday.delete({
        where: { holidayId },
      });
    }),
});
