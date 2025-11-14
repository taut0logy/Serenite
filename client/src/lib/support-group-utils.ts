import { format, isToday, isTomorrow, isThisWeek, isThisMonth, differenceInHours } from "date-fns";

// Gradient pool for consistent group coloring
const gradients = [
    "from-blue-500 to-cyan-600",
    "from-purple-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-green-500 to-emerald-600",
    "from-pink-500 to-rose-600",
    "from-indigo-500 to-purple-600",
    "from-teal-500 to-cyan-600",
    "from-yellow-500 to-amber-600",
    "from-violet-500 to-purple-600",
    "from-emerald-500 to-green-600",
    "from-red-500 to-pink-600",
];

/**
 * Get a consistent gradient for a group based on its ID
 */
export const getGradientForGroup = (groupId: string): string => {
    const index =
        groupId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
        gradients.length;
    return gradients[index];
};

/**
 * Format next meeting date with meeting time intuitively
 * Returns plain text for display
 */
export const formatNextMeeting = (
    date: Date | null,
    meetingTime?: string | null
): string => {
    if (!date) return "Not scheduled";

    const meetingDate = new Date(date);
    const now = new Date();
    const hoursUntil = differenceInHours(meetingDate, now);

    // Check if live (within meeting window - assuming 2 hour sessions)
    const isLive = hoursUntil <= 0 && hoursUntil >= -2;

    // Check if starting soon (within next 2 hours)
    const isStartingSoon = hoursUntil > 0 && hoursUntil <= 2;

    if (isLive) {
        return "Live Now";
    }

    if (isStartingSoon) {
        const minutes = Math.round(hoursUntil * 60);
        return `Starting in ${minutes} min`;
    }

    if (isToday(meetingDate)) {
        return `Today at ${meetingTime || format(meetingDate, "h:mm a")}`;
    }

    if (isTomorrow(meetingDate)) {
        return `Tomorrow at ${meetingTime || format(meetingDate, "h:mm a")}`;
    }

    if (isThisWeek(meetingDate)) {
        return `This ${format(meetingDate, "EEEE")} at ${meetingTime || format(meetingDate, "h:mm a")}`;
    }

    if (isThisMonth(meetingDate)) {
        return `${format(meetingDate, "MMM d")} at ${meetingTime || format(meetingDate, "h:mm a")}`;
    }

    return `Next ${format(meetingDate, "MMM d")}`;
};

/**
 * Format next meeting date with metadata (for recommendations component)
 * Returns object with text and status flags
 */
export const formatNextMeetingWithStatus = (
    date: Date | null
): { text: string; isLive: boolean; isStartingSoon: boolean } => {
    if (!date)
        return { text: "Not scheduled", isLive: false, isStartingSoon: false };

    const meetingDate = new Date(date);
    const now = new Date();
    const hoursUntil = differenceInHours(meetingDate, now);

    // Check if live (within meeting window - assuming 2 hour sessions)
    const isLive = hoursUntil <= 0 && hoursUntil >= -2;

    // Check if starting soon (within next 2 hours)
    const isStartingSoon = hoursUntil > 0 && hoursUntil <= 2;

    if (isLive) {
        return { text: "Live Now", isLive: true, isStartingSoon: false };
    }

    if (isStartingSoon) {
        const minutes = Math.round(hoursUntil * 60);
        return {
            text: `Starting in ${minutes} min`,
            isLive: false,
            isStartingSoon: true,
        };
    }

    if (isToday(meetingDate)) {
        return {
            text: `Today at ${format(meetingDate, "h:mm a")}`,
            isLive: false,
            isStartingSoon: false,
        };
    }

    if (isTomorrow(meetingDate)) {
        return {
            text: `Tomorrow at ${format(meetingDate, "h:mm a")}`,
            isLive: false,
            isStartingSoon: false,
        };
    }

    if (isThisWeek(meetingDate)) {
        return {
            text: `This ${format(meetingDate, "EEEE 'at' h:mm a")}`,
            isLive: false,
            isStartingSoon: false,
        };
    }

    if (isThisMonth(meetingDate)) {
        return {
            text: `${format(meetingDate, "MMM d 'at' h:mm a")}`,
            isLive: false,
            isStartingSoon: false,
        };
    }

    return {
        text: `Next ${format(meetingDate, "MMM d")}`,
        isLive: false,
        isStartingSoon: false,
    };
};
