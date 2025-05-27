import { z } from 'zod';

// Base Notification Schema - Reflects the Prisma model
export const notificationSchema = z.object({
  notificationId: z.string().cuid(),
  userId: z.string().cuid(),
  organizationId: z.string().cuid(),
  message: z.string(),
  isRead: z.boolean(),
  link: z.string().url().optional().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type NotificationOutput = z.infer<typeof notificationSchema>;

// Input schema for marking a single notification as read
export const markAsReadInputSchema = z.object({
  notificationId: z.string().cuid({ message: "Valid Notification ID is required" }),
});
export type MarkAsReadInput = z.infer<typeof markAsReadInputSchema>;

// Input schema for listing notifications for a user
export const listNotificationsInputSchema = z.object({
  limit: z.number().min(1).max(50).default(10).optional(), // Default limit to 10, max 50
  unreadOnly: z.boolean().default(false).optional(), // Default to show all (read and unread)
  // cursor: z.string().cuid().optional(), // Optional: For cursor-based pagination if needed later
});
export type ListNotificationsInput = z.infer<typeof listNotificationsInputSchema>;

// (Optional) Input schema for marking multiple notifications as read
export const markMultipleAsReadInputSchema = z.object({
  notificationIds: z.array(z.string().cuid()).min(1, "At least one Notification ID is required"),
});
export type MarkMultipleAsReadInput = z.infer<typeof markMultipleAsReadInputSchema>;
