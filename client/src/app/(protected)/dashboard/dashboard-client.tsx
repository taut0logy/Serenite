"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Calendar,
    Users,
    Clock,
    Search,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    Video,
    LogOut,
    AlertCircle,
    Play,
    Hash,
    Sparkles,
    UserPlus,
    Heart,
    Sun,
    Moon,
    Leaf,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SupportGroupRecommendation } from "@/actions/support-group.actions";
import type { UpcomingMeeting, MissedMeeting } from "@/actions/meeting.actions";
import {
    getSupportGroupRecommendations,
    refreshSupportGroupRecommendations,
    leaveSupportGroup,
    getGroupByShareableId,
} from "@/actions/support-group.actions";
import { formatNextMeeting } from "@/lib/support-group-utils";
import { TestMeetingCard } from "@/components/dashboard/test-meeting-card";

interface DashboardClientProps {
    userGroups: SupportGroupRecommendation[];
    upcomingMeetings: UpcomingMeeting[];
    missedMeetings: MissedMeeting[];
    canJoinMoreGroups: boolean;
}

// Gentle, calming color palettes for cards
const WELLNESS_GRADIENTS = [
    "from-emerald-400/20 via-teal-300/10 to-cyan-400/20",
    "from-violet-400/20 via-purple-300/10 to-fuchsia-400/20",
    "from-amber-400/20 via-orange-300/10 to-rose-400/20",
    "from-sky-400/20 via-blue-300/10 to-indigo-400/20",
];

const getWellnessGradient = (index: number) => WELLNESS_GRADIENTS[index % WELLNESS_GRADIENTS.length];

export function DashboardClient({
    userGroups: initialUserGroups,
    upcomingMeetings,
    missedMeetings,
    canJoinMoreGroups,
}: DashboardClientProps) {
    const router = useRouter();
    const [userGroups, setUserGroups] = useState(initialUserGroups);
    const [recommendations, setRecommendations] = useState<SupportGroupRecommendation[]>([]);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
    const [hasLoadedRecommendations, setHasLoadedRecommendations] = useState(false);
    const [showMissedMeetings, setShowMissedMeetings] = useState(false);
    const [shareableIdSearch, setShareableIdSearch] = useState("");
    const [searchResult, setSearchResult] = useState<SupportGroupRecommendation | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Load recommendations (from DB or generate new)
    const loadRecommendations = useCallback(async () => {
        setIsLoadingRecommendations(true);
        try {
            const result = await getSupportGroupRecommendations();
            if (result.success && result.recommendations) {
                setRecommendations(result.recommendations);
            }
        } catch (error) {
            console.error("Error loading recommendations:", error);
            toast.error("Failed to load recommendations");
        } finally {
            setIsLoadingRecommendations(false);
            setHasLoadedRecommendations(true);
        }
    }, []);

    // Refresh recommendations (force regenerate)
    const handleRefreshRecommendations = useCallback(async () => {
        setIsLoadingRecommendations(true);
        try {
            const result = await refreshSupportGroupRecommendations();
            if (result.success && result.recommendations) {
                setRecommendations(result.recommendations);
                toast.success("Recommendations refreshed");
            }
        } catch (error) {
            console.error("Error refreshing recommendations:", error);
            toast.error("Failed to refresh recommendations");
        } finally {
            setIsLoadingRecommendations(false);
        }
    }, []);

    // Auto-load recommendations on mount if user can join more groups
    useEffect(() => {
        if (canJoinMoreGroups && !hasLoadedRecommendations) {
            loadRecommendations();
        }
    }, [canJoinMoreGroups, hasLoadedRecommendations, loadRecommendations]);

    // Search by shareable ID
    const handleShareableIdSearch = async () => {
        const cleanId = shareableIdSearch.replace(/^#/, "").trim();
        if (!cleanId) {
            setSearchError("Please enter a shareable ID");
            return;
        }

        setIsSearching(true);
        setSearchError(null);
        setSearchResult(null);

        try {
            const result = await getGroupByShareableId(cleanId);
            if (result.success && result.group) {
                setSearchResult(result.group);
            } else {
                setSearchError("Group not found. Please check the ID and try again.");
            }
        } catch (error) {
            console.error("Error searching for group:", error);
            setSearchError("Failed to search. Please try again.");
        } finally {
            setIsSearching(false);
        }
    };

    // Leave group
    const handleLeaveGroup = async (groupId: string, groupName: string) => {
        try {
            await leaveSupportGroup(groupId);
            setUserGroups((prev) => prev.filter((g) => g.id !== groupId));
            toast.success(`Left ${groupName}`);
        } catch (error) {
            console.error("Error leaving group:", error);
            toast.error("Failed to leave group");
        }
    };

    // Navigate to join confirmation
    const handleJoinClick = (shareableId: string) => {
        router.push(`/groups/join/${shareableId}`);
    };

    // Format meeting time relative to now
    const formatMeetingTime = (date: Date) => {
        const now = new Date();
        const meetingDate = new Date(date);
        const diffMs = meetingDate.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMs < 0) return "Now";
        if (diffHours < 1) return "Starting soon";
        if (diffHours < 24) return `In ${diffHours} hours`;
        if (diffDays === 1) return "Tomorrow";
        return `In ${diffDays} days`;
    };

    // Get time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return { text: "Good morning", icon: Sun };
        if (hour < 18) return { text: "Good afternoon", icon: Leaf };
        return { text: "Good evening", icon: Moon };
    };

    const greeting = getGreeting();
    const GreetingIcon = greeting.icon;

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
                <motion.div
                    className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent blur-3xl"
                    animate={{
                        x: [0, 30, 0],
                        y: [0, -20, 0],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl"
                    animate={{
                        x: [0, -20, 0],
                        y: [0, 20, 0],
                        scale: [1, 1.05, 1],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            <div className="container mx-auto max-w-5xl px-4 py-10 space-y-10">

                {/* Hero Header */}
                <motion.header
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center space-y-4"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        <GreetingIcon className="w-4 h-4" />
                        {greeting.text}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        Your <span className="bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">Wellness</span> Space
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        {userGroups.length === 0
                            ? "Begin your journey by joining a supportive community"
                            : "Stay connected with your support communities"
                        }
                    </p>
                </motion.header>

                {/* Upcoming Meetings - Prominent Card */}
                {upcomingMeetings.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-primary/10 via-card to-violet-500/5">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold">Upcoming Sessions</h2>
                                        <p className="text-sm text-muted-foreground">Your scheduled group meetings</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {upcomingMeetings.map((meeting, idx) => (
                                        <motion.div
                                            key={meeting.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 + idx * 0.05 }}
                                            className={cn(
                                                "flex items-center justify-between p-4 rounded-2xl border transition-all hover:shadow-md",
                                                meeting.status === "RUNNING"
                                                    ? "bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-200 dark:border-red-800/50"
                                                    : "bg-background/80 backdrop-blur-sm border-border/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-14 h-14 rounded-2xl flex items-center justify-center",
                                                    meeting.status === "RUNNING"
                                                        ? "bg-red-500/20"
                                                        : "bg-gradient-to-br from-primary/20 to-violet-500/20"
                                                )}>
                                                    <Video className={cn(
                                                        "w-6 h-6",
                                                        meeting.status === "RUNNING" ? "text-red-500" : "text-primary"
                                                    )} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-lg">{meeting.groupName}</p>
                                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {formatMeetingTime(meeting.startTime)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => router.push(`/meeting/${meeting.id}`)}
                                                size="lg"
                                                className={cn(
                                                    "rounded-xl px-6 shadow-lg",
                                                    meeting.status === "RUNNING" && "bg-red-500 hover:bg-red-600 animate-pulse"
                                                )}
                                            >
                                                {meeting.status === "RUNNING" ? (
                                                    <>
                                                        <Play className="w-4 h-4 mr-2" />
                                                        Join Live
                                                    </>
                                                ) : (
                                                    "Details"
                                                )}
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.section>
                )}

                {/* Missed Meetings - Subtle Collapsible */}
                {missedMeetings.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <Card className="border border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-900/10 dark:to-orange-900/5">
                            <button
                                onClick={() => setShowMissedMeetings(!showMissedMeetings)}
                                className="w-full p-4 flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <span className="font-medium text-amber-700 dark:text-amber-300">
                                        {missedMeetings.length} missed session{missedMeetings.length > 1 ? 's' : ''} this week
                                    </span>
                                </div>
                                <motion.div
                                    animate={{ rotate: showMissedMeetings ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ChevronDown className="w-5 h-5 text-amber-600" />
                                </motion.div>
                            </button>
                            <AnimatePresence>
                                {showMissedMeetings && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <CardContent className="pt-0 pb-4 space-y-2">
                                            <p className="text-sm text-muted-foreground mb-3 px-1">
                                                Life gets busy — no pressure. Here&apos;s what you missed:
                                            </p>
                                            {missedMeetings.map((meeting) => (
                                                <div
                                                    key={meeting.id}
                                                    className="flex items-center justify-between p-3 bg-background/60 rounded-xl"
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm">{meeting.groupName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(meeting.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    {meeting.hasRecording && (
                                                        <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/20">
                                                            <Play className="w-3.5 h-3.5 mr-1.5" />
                                                            Watch
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </CardContent>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Card>
                    </motion.section>
                )}

                {/* Test Meeting Card - Development Only */}
                {process.env.NODE_ENV !== "production" && (
                    <TestMeetingCard />
                )}

                {/* My Groups Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-5"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                                <Heart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">My Communities</h2>
                                <p className="text-sm text-muted-foreground">
                                    {userGroups.length}/3 groups joined
                                </p>
                            </div>
                        </div>
                    </div>

                    {userGroups.length === 0 ? (
                        <Card className="border-dashed border-2 bg-gradient-to-br from-muted/30 to-muted/10">
                            <CardContent className="py-16 text-center">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
                                    <Users className="w-10 h-10 text-primary/60" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Find Your People</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    Join a support group to connect with others who understand your journey.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {userGroups.map((group, idx) => (
                                <motion.div
                                    key={group.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2 + idx * 0.05 }}
                                >
                                    <Card className={cn(
                                        "overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group",
                                        "bg-gradient-to-br",
                                        getWellnessGradient(idx)
                                    )}>
                                        <CardContent className="p-5 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <Badge variant="secondary" className="text-xs font-medium">
                                                        {group.type}
                                                    </Badge>
                                                    <h3 className="font-semibold text-lg leading-tight line-clamp-2 pt-1">
                                                        {group.name}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1.5">
                                                    <Users className="w-4 h-4" />
                                                    {group.memberCount}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4" />
                                                    {formatNextMeeting(group.nextMeetingDate, group.meetingTime)}
                                                </span>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                                                onClick={() => handleLeaveGroup(group.id, group.name)}
                                            >
                                                <LogOut className="w-4 h-4 mr-2" />
                                                Leave Group
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.section>

                {/* Find by ID Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-r from-card via-card to-primary/5">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center">
                                    <Hash className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">Join by Invite Code</h2>
                                    <p className="text-sm text-muted-foreground">Have a group code? Enter it here</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">#</span>
                                    <Input
                                        placeholder="Enter code..."
                                        value={shareableIdSearch}
                                        onChange={(e) => {
                                            setShareableIdSearch(e.target.value);
                                            setSearchError(null);
                                            setSearchResult(null);
                                        }}
                                        onKeyDown={(e) => e.key === "Enter" && handleShareableIdSearch()}
                                        className="pl-9 h-12 rounded-xl border-border/50 bg-background/50 font-mono"
                                    />
                                </div>
                                <Button
                                    onClick={handleShareableIdSearch}
                                    disabled={isSearching || !shareableIdSearch.trim()}
                                    size="lg"
                                    className="h-12 px-6 rounded-xl"
                                >
                                    {isSearching ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Search className="w-5 h-5" />
                                    )}
                                </Button>
                            </div>

                            {searchError && (
                                <p className="text-sm text-destructive flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {searchError}
                                </p>
                            )}

                            {searchResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-lg">{searchResult.name}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {searchResult.memberCount}/{searchResult.maxMembers} members • {searchResult.type}
                                            </p>
                                        </div>
                                        {searchResult.isMember ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                Joined
                                            </Badge>
                                        ) : searchResult.vacancy <= 0 ? (
                                            <Badge variant="destructive">Full</Badge>
                                        ) : (
                                            <Button onClick={() => handleJoinClick(searchResult.shareableId)} className="rounded-xl">
                                                <UserPlus className="w-4 h-4 mr-2" />
                                                View & Join
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Recommendations Section */}
                {canJoinMoreGroups && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-5"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">Recommended for You</h2>
                                    <p className="text-sm text-muted-foreground">Based on your wellness profile</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefreshRecommendations}
                                disabled={isLoadingRecommendations}
                                className="rounded-xl"
                            >
                                <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingRecommendations && "animate-spin")} />
                                Refresh
                            </Button>
                        </div>

                        {!hasLoadedRecommendations ? (
                            <Card className="border-dashed border-2 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5">
                                <CardContent className="py-12 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                                        <RefreshCw className="w-8 h-8 text-violet-500/60 animate-spin" />
                                    </div>
                                    <p className="text-muted-foreground">
                                        Finding your best matches...
                                    </p>
                                </CardContent>
                            </Card>
                        ) : recommendations.length === 0 ? (
                            <Card className="bg-muted/20">
                                <CardContent className="py-10 text-center">
                                    <p className="text-muted-foreground">
                                        No recommendations available right now. Try again later or search by code.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {recommendations.map((group, idx) => (
                                    <motion.div
                                        key={group.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 + idx * 0.05 }}
                                        className="h-full"
                                    >
                                        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card h-full flex flex-col">
                                            <div className={cn(
                                                "h-3 bg-gradient-to-r shrink-0",
                                                group.matchScore >= 80 ? "from-emerald-500 to-teal-500" :
                                                    group.matchScore >= 60 ? "from-violet-500 to-fuchsia-500" :
                                                        "from-sky-500 to-blue-500"
                                            )} />
                                            <CardContent className="p-5 flex flex-col flex-1">
                                                <div className="flex items-start justify-between mb-4">
                                                    <Badge
                                                        className={cn(
                                                            "text-xs font-semibold",
                                                            group.matchScore >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                                                group.matchScore >= 60 ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" :
                                                                    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                                                        )}
                                                    >
                                                        {group.matchScore}% match
                                                    </Badge>
                                                    {group.vacancy <= 2 && group.vacancy > 0 && (
                                                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                                            {group.vacancy} left
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg mb-1 line-clamp-1">{group.name}</h3>
                                                    {group.description && (
                                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                                            {group.description}
                                                        </p>
                                                    )}

                                                    <div className="flex flex-wrap gap-1.5">
                                                        {group.tags.slice(0, 3).map((tag) => (
                                                            <Badge key={tag} variant="secondary" className="text-xs rounded-full">
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>

                                                <Button
                                                    className="w-full rounded-xl mt-4"
                                                    onClick={() => handleJoinClick(group.shareableId)}
                                                    disabled={group.vacancy <= 0}
                                                >
                                                    {group.vacancy <= 0 ? "Full" : (
                                                        <>
                                                            <ChevronRight className="w-4 h-4 mr-1" />
                                                            Learn More
                                                        </>
                                                    )}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.section>
                )}

                {/* Max groups message */}
                {!canJoinMoreGroups && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-6"
                    >
                        <Badge variant="secondary" className="text-sm py-2 px-5 rounded-full">
                            ✨ You&apos;re part of 3 communities — your heart is full!
                        </Badge>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
