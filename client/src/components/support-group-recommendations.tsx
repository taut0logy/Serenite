"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getSupportGroupRecommendations,
    joinSupportGroup,
    leaveSupportGroup,
    type SupportGroupRecommendation,
} from "@/actions/support-group.actions";
import {
    Users,
    Calendar,
    Clock,
    TrendingUp,
    CheckCircle2,
    UserPlus,
    UserMinus,
    Sparkles,
    Video,
} from "lucide-react";
import { toast } from "sonner";
import {
    format,
    isToday,
    isTomorrow,
    isThisWeek,
    isThisMonth,
    differenceInHours,
} from "date-fns";

// Pool of beautiful gradients for cards
const gradients = [
    "from-blue-500 to-purple-600",
    "from-green-500 to-teal-600",
    "from-purple-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-indigo-500 to-blue-600",
    "from-pink-500 to-rose-600",
    "from-cyan-500 to-blue-600",
    "from-violet-500 to-purple-600",
    "from-emerald-500 to-green-600",
    "from-red-500 to-pink-600",
];

// Get a consistent gradient for a group based on its ID
const getGradientForGroup = (groupId: string): string => {
    const index =
        groupId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
        gradients.length;
    return gradients[index];
};

// Format next meeting date intuitively
const formatNextMeeting = (
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

interface SupportGroupRecommendationsProps {
    limit?: number;
}

export function SupportGroupRecommendations({
    limit = 5,
}: SupportGroupRecommendationsProps) {
    const [recommendations, setRecommendations] = useState<
        SupportGroupRecommendation[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [joiningGroup, setJoiningGroup] = useState<string | null>(null);

    const loadRecommendations = async () => {
        setLoading(true);
        const result = await getSupportGroupRecommendations(limit);
        if (result.success && result.recommendations) {
            setRecommendations(result.recommendations);
        } else {
            toast.error("Failed to load recommendations");
        }
        setLoading(false);
    };

    useEffect(() => {
        loadRecommendations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleJoinGroup = async (groupId: string) => {
        setJoiningGroup(groupId);
        const result = await joinSupportGroup(groupId);

        if (result.success) {
            toast.success("Successfully joined the support group!");
            await loadRecommendations(); // Reload to update membership status
        } else {
            toast.error(result.error || "Failed to join support group");
        }
        setJoiningGroup(null);
    };

    const handleLeaveGroup = async (groupId: string) => {
        setJoiningGroup(groupId);
        const result = await leaveSupportGroup(groupId);

        if (result.success) {
            toast.success("Left the support group");
            await loadRecommendations(); // Reload to update membership status
        } else {
            toast.error(result.error || "Failed to leave support group");
        }
        setJoiningGroup(null);
    };

    const formatMeetingSchedule = (group: SupportGroupRecommendation) => {
        if (!group.meetingDayOfWeek || !group.meetingTime) {
            return "Schedule TBD";
        }

        const day =
            group.meetingDayOfWeek.charAt(0) +
            group.meetingDayOfWeek.slice(1).toLowerCase();
        const type =
            group.type === "WEEKLY"
                ? "Weekly"
                : group.type === "BIWEEKLY"
                ? "Bi-weekly"
                : "Monthly";

        return `${type}, ${day}s`;
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-bold">
                        Recommended Support Groups
                    </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-full" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (recommendations.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Recommended Support Groups
                    </CardTitle>
                    <CardDescription>
                        Complete your mental health questionnaire to get
                        personalized recommendations
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-bold">Recommended For You</h2>
                </div>
                <Badge variant="secondary" className="text-xs">
                    {recommendations.length} Groups
                </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((group) => {
                    const gradient = getGradientForGroup(group.id);
                    const meetingInfo = formatNextMeeting(
                        group.nextMeetingDate
                    );

                    return (
                        <Card
                            key={group.id}
                            className="h-full flex flex-col bg-card/50 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
                        >
                            {/* Gradient Header */}
                            <div
                                className={`h-32 bg-gradient-to-br ${gradient} relative`}
                            >
                                <div className="absolute inset-0 bg-black/10" />

                                {/* Top badges */}
                                <div className="absolute top-4 left-4 flex items-center gap-2">
                                    {meetingInfo.isLive && (
                                        <Badge className="bg-red-500 text-white animate-pulse">
                                            <div className="w-2 h-2 bg-white rounded-full mr-1" />
                                            LIVE
                                        </Badge>
                                    )}
                                    {meetingInfo.isStartingSoon && (
                                        <Badge className="bg-orange-500 text-white">
                                            <Clock className="w-3 h-3 mr-1" />
                                            Starting Soon
                                        </Badge>
                                    )}
                                    {group.type && (
                                        <Badge
                                            variant="secondary"
                                            className="bg-white/20 text-white border-0"
                                        >
                                            {group.type === "WEEKLY"
                                                ? "Weekly"
                                                : group.type === "BIWEEKLY"
                                                ? "Bi-weekly"
                                                : "Monthly"}
                                        </Badge>
                                    )}
                                </div>

                                {/* Match score */}
                                {group.matchScore > 0 && (
                                    <div className="absolute top-4 right-4">
                                        <Badge
                                            variant="outline"
                                            className="bg-white/20 text-white border-white/30 flex items-center gap-1"
                                        >
                                            <TrendingUp className="h-3 w-3" />
                                            {group.matchScore}% Match
                                        </Badge>
                                    </div>
                                )}

                                {/* Member status */}
                                {group.isMember && (
                                    <div className="absolute bottom-4 left-4">
                                        <Badge
                                            variant="outline"
                                            className="bg-white/20 text-white border-white/30"
                                        >
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Joined
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <CardTitle className="text-xl leading-tight">
                                        {group.name}
                                    </CardTitle>
                                </div>
                                <CardDescription className="line-clamp-2 leading-relaxed mt-2">
                                    {group.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                        <span>{group.memberCount} members</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span>
                                            {formatMeetingSchedule(group)}
                                        </span>
                                    </div>
                                </div>

                                {/* Next Session */}
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span
                                        className={
                                            meetingInfo.isLive
                                                ? "text-red-500 font-medium"
                                                : meetingInfo.isStartingSoon
                                                ? "text-orange-500 font-medium"
                                                : ""
                                        }
                                    >
                                        {meetingInfo.text}
                                    </span>
                                </div>

                                {/* Join Button */}
                                <div className="pt-2 mt-auto">
                                    <Button
                                        onClick={() =>
                                            group.isMember
                                                ? handleLeaveGroup(group.id)
                                                : handleJoinGroup(group.id)
                                        }
                                        disabled={joiningGroup === group.id}
                                        className={`w-full ${
                                            meetingInfo.isLive
                                                ? "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
                                                : group.isMember
                                                ? ""
                                                : "bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700"
                                        } ${
                                            !group.isMember &&
                                            !meetingInfo.isLive
                                                ? "text-white border-0"
                                                : ""
                                        } group-hover:scale-105 transition-transform`}
                                        variant={
                                            group.isMember &&
                                            !meetingInfo.isLive
                                                ? "outline"
                                                : "default"
                                        }
                                    >
                                        {group.isMember ? (
                                            <>
                                                <UserMinus className="h-4 w-4 mr-2" />
                                                Leave Group
                                            </>
                                        ) : (
                                            <>
                                                {meetingInfo.isLive ? (
                                                    <>
                                                        <Video className="w-4 h-4 mr-2" />
                                                        Join Live Session
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="h-4 w-4 mr-2" />
                                                        Join Group
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
