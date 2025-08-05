import { useCallback, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@apollo/client';
import { useNotificationStore } from '@/stores/use-notification-store';
import { GET_NOTIFICATIONS, MARK_NOTIFICATIONS_READ, DELETE_NOTIFICATION, DELETE_ALL_NOTIFICATIONS } from '@/graphql/operations';
import type { Notification } from '@/stores/use-notification-store';
import { useAuthContext } from '@/providers/auth-provider';

export function useNotifications() {
  const { user } = useAuthContext();
  const socket = useSocket();
  const {
    notifications,
    unreadCount,
    setNotifications,
    addNotification,
    markAsRead: storeMarkAsRead,
    markAllAsRead: storeMarkAllAsRead,
    deleteNotification: storeDeleteNotification,
    deleteAllNotifications: storeDeleteAllNotifications,
    getUnreadNotifications,
    getNotificationsByType
  } = useNotificationStore();

  const { loading: isLoading, refetch } = useQuery(GET_NOTIFICATIONS, {
    variables: {
      userId: user?.id || '',
    },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      if (data?.notifications) {
        const notificationNodes = data.notifications.edges.map((edge: { node: Notification }) => edge.node);
        setNotifications(notificationNodes);
      }
    }
  });

  const [markNotificationsRead] = useMutation(MARK_NOTIFICATIONS_READ, {
    onCompleted: () => {
      storeMarkAllAsRead();
    }
  });

  const [deleteNotificationMutation] = useMutation(DELETE_NOTIFICATION, {
    onCompleted: (_, context) => {
      if (context?.variables?.id) {
        storeDeleteNotification(context.variables.id);
      }
    }
  });

  const [deleteAllNotificationsMutation] = useMutation(DELETE_ALL_NOTIFICATIONS, {
    onCompleted: () => {
      storeDeleteAllNotifications();
    }
  });

  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationsRead({
        variables: { ids: [notificationId] },
        optimisticResponse: {
          markNotificationsRead: true
        }
      });
      storeMarkAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = getUnreadNotifications().map(n => n.id);
      if (unreadIds.length > 0) {
        await markNotificationsRead({
          variables: { ids: unreadIds },
          optimisticResponse: {
            markNotificationsRead: true
          }
        });
        storeMarkAllAsRead();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteNotificationMutation({
        variables: { id: notificationId },
        optimisticResponse: {
          deleteNotification: true
        }
      });
      storeDeleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await deleteAllNotificationsMutation({
        optimisticResponse: {
          deleteAllNotifications: true
        }
      });
      storeDeleteAllNotifications();
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  useEffect(() => {
    if (!socket || !user) return;

    const handleNotification = (notification: Notification) => {
      addNotification(notification);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, user, addNotification]);

  const notify = useCallback((message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    toast[type](message);
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getUnreadNotifications,
    getNotificationsByType,
    notify,
  };
} 