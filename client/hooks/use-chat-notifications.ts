"use client";

import { useState, useCallback } from "react";

interface ChatNotification {
    id: string;
    message: string;
    userName: string;
    timestamp: Date;
}

export const useChatNotifications = () => {
    const [notifications, setNotifications] = useState<ChatNotification[]>([]);

    const addNotification = useCallback((notification: Omit<ChatNotification, "timestamp">) => {
        const newNotification: ChatNotification = {
            ...notification,
            timestamp: new Date(),
        };

        setNotifications(prev => [...prev, newNotification]);

        // Auto remove notification after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
        }, 5000);
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return {
        notifications,
        addNotification,
        clearNotifications,
        removeNotification,
    };
};
