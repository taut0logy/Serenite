"use client";

import { useCallback, useState } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
  Bell, 
  Check, 
  MessageSquare, 
  Video, 
  Hand, 
  BarChart2,
  VideoOff,
  AlertCircle,
  Calendar,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
//import { useRouter } from 'next/navigation';
import { RefreshCcw } from 'lucide-react';
import type { Notification, NotificationType } from '@/stores/use-notification-store';
;

const NOTIFICATION_ICONS: Record<NotificationType, React.ReactNode> = {
  MEETING_REQUEST: <Calendar className="h-4 w-4" />,
  MEETING_UPDATE: <Calendar className="h-4 w-4" />,
  MEETING_CANCELLED: <AlertCircle className="h-4 w-4" />,
  MEETING_REMOVED: <AlertCircle className="h-4 w-4" />,
  MEETING_CAMERA_OFF: <VideoOff className="h-4 w-4" />,
  MESSAGE: <MessageSquare className="h-4 w-4" />,
  POLL_CREATED: <BarChart2 className="h-4 w-4" />,
  POLL_ENDED: <BarChart2 className="h-4 w-4" />,
  HAND_RAISED: <Hand className="h-4 w-4" />,
  HAND_LOWERED: <Hand className="h-4 w-4" />,
  RECORDING_STARTED: <Video className="h-4 w-4" />,
  RECORDING_STOPPED: <Video className="h-4 w-4" />,
};

export function NotificationMenu() {
  //const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    isLoading,
    refetch
  } = useNotifications();

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    await markAsRead(notificationId);
  }, [markAsRead]);

  const handleDelete = useCallback(async (notificationId: string) => {
    await deleteNotification(notificationId);
  }, [deleteNotification]);

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  const handleDeleteAll = useCallback(async () => {
    await deleteAllNotifications();
  }, [deleteAllNotifications]);

    // const handleNotificationAction = (notification: Notification) => {
    //   if (!notification.read) {
    //     handleMarkAsRead(notification.id);
    //   }
      
    //   switch (notification.type) {
    //     case "MEETING_REQUEST":
    //       router.push("/dashboard?tab=invites");
    //       break;
    //     case "MEETING_UPDATE":
    //     case "MEETING_CANCELLED":
    //     case "MEETING_REMOVED":
    //     case "MEETING_CAMERA_OFF":
    //       if (notification.meta?.meetingId) {
    //         router.push(`/meeting/${notification.meta.meetingId}`);
    //       } else {
    //         router.push("/dashboard");
    //       }
    //       break;
    //     case "MESSAGE":
    //       if (notification.meta?.meetingId) {
    //         router.push(`/meeting/${notification.meta.meetingId}`);
    //       } else if (notification.meta?.senderId) {
    //         router.push(`/messages/${notification.meta.senderId}`);
    //       } else {
    //         router.push("/messages");
    //       }
    //       break;
    //     default:
    //       router.push("/dashboard");
    //   }
      
    //   setIsOpen(false);
    // };

  const renderNotification = (notification: Notification) => {
    const icon = NOTIFICATION_ICONS[notification.type];
    const isUnread = !notification.read;

    return (
      <motion.div
        key={notification.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg transition-colors",
          isUnread ? "bg-muted/50" : "hover:bg-muted/30"
        )}
      >
        <div className="mt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-none">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(notification.createdAt), 'PPp')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isUnread && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleMarkAsRead(notification.id)}
            >
              <Check className="h-3.5 w-3.5" />
              <span className="sr-only">Mark as read</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer"
            onClick={() => handleDelete(notification.id)}
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Delete notification</span>
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full h-10 w-10">
          <Bell className="h-8 w-8" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="sm:w-80 w-[90vw] overflow-y-hidden mx-4">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={handleDeleteAll}
              >
                Clear all
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-muted/50 rounded-2xl cursor-pointer"
            onClick={() => {
              refetch();
            }}
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-1">
            <AnimatePresence>
              {isLoading ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No notifications
                </div>
              ) : (
                notifications.map(renderNotification)
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 