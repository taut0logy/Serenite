"use strict";

import prisma from "@/lib/prisma";
import { Notification, NotificationType } from "@/lib/generated/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const io = (global as any).io;

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId: string, take: number = 10, skip: number = 0): Promise<{
  notifications: Notification[];
  totalCount: number;
}> {
  try {
    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        skip
      }),
      prisma.notification.count({
        where: { userId }
      })
    ]);

    return { notifications, totalCount };
  } catch (error) {
    console.error(`Error getting notifications for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Create a notification
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createNotification(userId: string, type: NotificationType, message: string, meta: any = {}): Promise<Notification> {
  try {
    // Ensure meta is a string
    const metaString = typeof meta === 'string' ? meta : JSON.stringify(meta);

    // Create notification in the database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        meta: metaString,
        read: false
      }
    });

    console.info(`Created notification for user ${userId} with type ${type}`);

    // Send real-time notification to user if they are online
    // For real-time notifications, we pass the parsed meta data
    io.to(userId).emit("notification", {
      id: notification.id,
      type: notification.type,
      message: notification.message,
      read: notification.read,
      createdAt: notification.createdAt,
      meta: meta // Use original meta object for socket
    });

    return notification;
  } catch (error) {
    console.error(`Error creating notification for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(notificationIds: string[]): Promise<boolean> {
  try {
    await prisma.notification.updateMany({
      where: {
        id: {
          in: notificationIds
        }
      },
      data: {
        read: true
      }
    });

    return true;
  } catch (error) {
    console.error(`Error marking notifications as read:`, error);
    throw error;
  }
}

/**
 * Count unread notifications for a user
 */
export async function countUnreadNotifications(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({
      where: {
        userId,
        read: false
      }
    });
  } catch (error) {
    console.error(`Error counting unread notifications for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string): Promise<boolean> {
  try {
    await prisma.notification.delete({
      where: { id }
    });

    return true;
  } catch (error) {
    console.error(`Error deleting notification ${id}:`, error);
    throw error;
  }
}

/**
 * Delete all notifications of an user
 */
export async function deleteAllNotifications(userId: string): Promise<boolean> {
  try {
    await prisma.notification.deleteMany({
      where: { userId }
    });

    return true;
  } catch (error) {
    console.error(`Error deleting all notifications for user ${userId}:`, error);
    throw error;
  }
}