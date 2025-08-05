import { create } from 'zustand';
import { useQuery, useMutation } from '@apollo/client';
import { GET_NOTIFICATIONS, MARK_NOTIFICATIONS_READ, DELETE_NOTIFICATION, DELETE_ALL_NOTIFICATIONS } from '@/graphql/operations';
import { useAuthContext } from '@/providers/auth-provider';
import { useSocket } from '@/providers/socket-provider';
import { useEffect } from 'react';

export type NotificationType = 
  | 'MEETING_REQUEST'
  | 'MEETING_UPDATE'
  | 'MEETING_CANCELLED'
  | 'MEETING_REMOVED'
  | 'MEETING_CAMERA_OFF'
  | 'MESSAGE'
  | 'POLL_CREATED'
  | 'POLL_ENDED'
  | 'HAND_RAISED'
  | 'HAND_LOWERED'
  | 'RECORDING_STARTED'
  | 'RECORDING_STOPPED';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  status: string;
  createdAt: string;
  meta: any;
}

interface NotificationEdge {
  node: Notification;
  cursor: string;
}

interface NotificationsData {
  notifications: {
    edges: NotificationEdge[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string;
      endCursor: string;
    };
    totalCount: number;
  };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  deleteAllNotifications: () => void;
  getUnreadNotifications: () => Notification[];
  getNotificationsByType: (type: NotificationType) => Notification[];
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  setNotifications: (notifications) => {
    set({ 
      notifications,
      unreadCount: notifications.filter(n => !n.read).length 
    });
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: state.unreadCount - 1
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
  },

  deleteNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id),
      unreadCount: state.unreadCount - (state.notifications.find(n => n.id === id)?.read ? 0 : 1)
    }));
  },

  deleteAllNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  getUnreadNotifications: () => {
    return get().notifications.filter(n => !n.read);
  },

  getNotificationsByType: (type) => {
    return get().notifications.filter(n => n.type === type);
  }
}));

export function useNotifications() {
  const { user } = useAuthContext();
  const socket = useSocket();
  const store = useNotificationStore();

  // GraphQL query to fetch notifications
  const { loading, error, refetch } = useQuery<NotificationsData>(GET_NOTIFICATIONS, {
    variables: {
      userId: user?.id,
      first: 10
    },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      if (data?.notifications) {
        const notificationNodes = data.notifications.edges.map((edge: NotificationEdge) => edge.node);
        store.setNotifications(notificationNodes);
      }
    }
  });

  // Mutation to mark notifications as read
  const [markNotificationsRead] = useMutation(MARK_NOTIFICATIONS_READ, {
    onCompleted: (data) => {
      if (data.markNotificationsRead.success) {
        store.markAllAsRead();
      }
    }
  });

  // Mutation to delete a notification
  const [deleteNotificationMutation] = useMutation(DELETE_NOTIFICATION, {
    onCompleted: (data) => {
      if (data.deleteNotification.success) {
        store.deleteNotification(data.deleteNotification.id);
      }
    }
  });

  // Mutation to delete all notifications
  const [deleteAllNotificationsMutation] = useMutation(DELETE_ALL_NOTIFICATIONS, {
    onCompleted: (data) => {
      if (data.deleteAllNotifications.success) {
        store.deleteAllNotifications();
      }
    }
  });

  // Socket event listener for real-time notifications
  useEffect(() => {
    if (!socket || !user) return;

    const handleNotification = (notification: Notification) => {
      store.addNotification(notification);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, user, store]);

  return {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    isLoading: loading,
    error,
    markAsRead: async (id: string) => {
      await markNotificationsRead({ variables: { ids: [id] } });
    },
    markAllAsRead: async () => {
      const unreadIds = store.getUnreadNotifications().map(n => n.id);
      if (unreadIds.length > 0) {
        await markNotificationsRead({ variables: { ids: unreadIds } });
      }
    },
    deleteNotification: async (id: string) => {
      await deleteNotificationMutation({ variables: { id } });
    },
    deleteAllNotifications: async () => {
      await deleteAllNotificationsMutation();
    },
    getUnreadNotifications: store.getUnreadNotifications,
    getNotificationsByType: store.getNotificationsByType,
    refetch
  };
} 