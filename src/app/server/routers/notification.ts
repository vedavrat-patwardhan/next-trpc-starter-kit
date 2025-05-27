import { z } from 'zod';
import {
  createTRPCRouter,
  protectedProcedure,
} from '@/app/server/trpc';
import {
  listNotificationsInputSchema,
  markAsReadInputSchema,
  notificationSchema, // For return type, though Prisma types are often used directly
} from '@/schemas/notification.schema';
import { TRPCError } from '@trpc/server';

export const notificationRouter = createTRPCRouter({
  listForUser: protectedProcedure
    .input(listNotificationsInputSchema)
    .query(async ({ ctx, input }) => {
      const { limit = 10, unreadOnly = false } = input;
      const userId = ctx.session.user.userId; // Corrected from .id to .userId
      const organizationId = ctx.session.user.organizationId;

      const whereClause: any = {
        userId,
        organizationId,
      };
      if (unreadOnly) {
        whereClause.isRead = false;
      }

      const notifications = await ctx.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      
      // No explicit total count needed for simple list, but could be added for pagination
      return notifications;
    }),

  markAsRead: protectedProcedure
    .input(markAsReadInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { notificationId } = input;
      const userId = ctx.session.user.userId; // Corrected
      const organizationId = ctx.session.user.organizationId;

      const notification = await ctx.prisma.notification.findUnique({
        where: { notificationId },
      });

      if (!notification) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Notification not found.' });
      }

      if (notification.userId !== userId || notification.organizationId !== organizationId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to update this notification.' });
      }

      if (notification.isRead) {
        // Optional: return the notification as is, or a specific message
        return notification; 
      }

      const updatedNotification = await ctx.prisma.notification.update({
        where: { notificationId },
        data: { isRead: true },
      });
      return updatedNotification;
    }),
  
  // Optional: Mark multiple as read
  markMultipleAsRead: protectedProcedure
    .input(z.object({ notificationIds: z.array(z.string().cuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
        const { notificationIds } = input;
        const userId = ctx.session.user.userId;
        const organizationId = ctx.session.user.organizationId;

        // Ensure all notifications belong to the user and organization before updating
        const updatedCount = await ctx.prisma.notification.updateMany({
            where: {
                notificationId: { in: notificationIds },
                userId,
                organizationId,
                isRead: false, // Only update unread ones
            },
            data: { isRead: true },
        });
        return { updatedCount: updatedCount.count };
    }),


  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.userId; // Corrected
      const organizationId = ctx.session.user.organizationId;

      const count = await ctx.prisma.notification.count({
        where: {
          userId,
          organizationId,
          isRead: false,
        },
      });
      return { count };
    }),
});
