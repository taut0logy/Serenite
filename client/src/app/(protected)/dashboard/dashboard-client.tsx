"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Video,
    Users,
    Clock,
    Search,
    Filter,
    Heart,
    MessageCircle,
    Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useAuth } from "@/providers/auth-provider";
import { SupportGroupRecommendations } from "@/components/support-group-recommendations";
import type {
    DashboardSupportGroup,
    DashboardStats,
} from "@/actions/dashboard.actions";
import {
    formatNextMeeting,
    getGradientForGroup,
} from "@/lib/support-group-utils";
import {
    joinSupportGroup,
    leaveSupportGroup,
} from "@/actions/support-group.actions";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
        },
    },
};

interface DashboardClientProps {
    supportGroups: DashboardSupportGroup[];
    stats: DashboardStats;
    allTags: string[];
}

export function DashboardClient({
    supportGroups: initialGroups,
    stats,
    allTags,
}: DashboardClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTag, setSelectedTag] = useState("all");
    const [supportGroups, setSupportGroups] = useState(initialGroups);
    const router = useRouter();
    const client = useStreamVideoClient();
    const { user } = useAuth();

    // Filter support groups based on search and filters
    const filteredGroups = useMemo(() => {
        return supportGroups.filter((group) => {
            const matchesSearch =
                group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                group.description
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                group.tags.some((tag) =>
                    tag.toLowerCase().includes(searchQuery.toLowerCase())
                );

            const matchesTag =
                selectedTag === "all" ||
                group.tags.some((tag) =>
                    tag.toLowerCase().includes(selectedTag.toLowerCase())
                );

            return matchesSearch && matchesTag;
        });
    }, [supportGroups, searchQuery, selectedTag]);

    const liveGroups = filteredGroups.filter((g) => g.isLive);
    const upcomingGroups = filteredGroups.filter((g) => !g.isLive).slice(0, 3);

    // Dummy showcase meeting handler
    const handleJoinShowcase = async () => {
        if (!client || !user) {
            toast.error("Please sign in to join a meeting");
            return;
        }

        try {
            toast.loading(
                "Joining Mindfulness & Meditation showcase session..."
            );

            const id = "showcase-mindfulness-demo";
            const call = client.call("default", id);

            if (!call) throw new Error("Failed to create meeting");

            await call.getOrCreate({
                data: {
                    starts_at: new Date().toISOString(),
                    custom: {
                        description:
                            "Mindfulness & Meditation - Showcase Session",
                        category: "Wellness Demo",
                        isShowcase: true,
                    },
                },
            });

            toast.dismiss();
            toast.success("Joining showcase session!");
            router.push(`/meeting/${call.id}`);
        } catch (error) {
            console.error("Error joining showcase:", error);
            toast.error("Failed to join showcase. Please try again.");
        }
    };

    const handleJoinGroup = async (group: DashboardSupportGroup) => {
        if (!client || !user) {
            toast.error("Please sign in to join a support group");
            return;
        }

        try {
            if (group.isMember) {
                // Leave the group
                await leaveSupportGroup(group.id);
                toast.success(`Left ${group.name}`);

                // Update local state
                setSupportGroups((prev) =>
                    prev.map((g) =>
                        g.id === group.id
                            ? {
                                  ...g,
                                  isMember: false,
                                  memberCount: g.memberCount - 1,
                              }
                            : g
                    )
                );
            } else {
                // Join the group
                await joinSupportGroup(group.id);

                if (group.isLive) {
                    // For live sessions, create an instant meeting
                    toast.loading(`Joining ${group.name} live session...`);

                    const id = `support-group-${group.id}`;
                    const call = client.call("default", id);

                    if (!call) throw new Error("Failed to create meeting");

                    await call.getOrCreate({
                        data: {
                            starts_at: new Date().toISOString(),
                            custom: {
                                description: `${group.name} - Support Group Session`,
                                category: group.type,
                                supportGroupId: group.id,
                            },
                        },
                    });

                    toast.dismiss();
                    toast.success(`Joining ${group.name}!`);
                    router.push(`/meeting/${call.id}`);
                } else {
                    toast.success(
                        `You've joined ${group.name}! You'll be notified before the next session.`
                    );
                }

                // Update local state
                setSupportGroups((prev) =>
                    prev.map((g) =>
                        g.id === group.id
                            ? {
                                  ...g,
                                  isMember: true,
                                  memberCount: g.memberCount + 1,
                              }
                            : g
                    )
                );
            }
        } catch (error) {
            console.error("Error joining support group:", error);
            toast.error("Failed to join support group. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 dark:from-background dark:to-primary/10">
            {/* Hero Section */}
            <section className="relative py-16 px-4">
                <div className="container mx-auto">
                    <motion.div
                        className="text-center max-w-4xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-primary/60 animate-pulse" />
                                <Heart className="w-16 h-16 text-primary/80" />
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Find Your{" "}
                            <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 dark:from-primary/90 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                                Support Community
                            </span>
                        </h1>

                        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                            Join caring communities where you can share, heal,
                            and grow together. Every journey is easier with the
                            right support.
                        </p>

                        {/* Quick Stats - Dynamic */}
                        <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">
                                    {stats.totalGroups}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Active Groups
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">
                                    {stats.totalMembers}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Total Members
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">
                                    {Math.max(1, stats.liveSessionsCount)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Live Now
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Personalized Recommendations Section */}
            <section className="px-4 pb-8">
                <div className="container mx-auto max-w-6xl">
                    <SupportGroupRecommendations limit={6} />
                </div>
            </section>

            {/* Quick Access - Live & Upcoming Sessions (Static as requested) */}
            <section className="px-4 pb-8">
                <div className="container mx-auto max-w-6xl">
                    <motion.div
                        className="grid md:grid-cols-2 gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.15 }}
                    >
                        {/* Live Sessions */}
                        <Card className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-200 dark:border-red-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                    Live Sessions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Dummy Showcase Session - Always visible */}
                                <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg mb-2">
                                    <div>
                                        <p className="font-medium text-sm">
                                            Mindfulness & Meditation
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Showcase session • 12 participants
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={handleJoinShowcase}
                                        className="bg-red-500 hover:bg-red-600 text-white"
                                    >
                                        Join Now
                                    </Button>
                                </div>

                                {/* Real live groups from database */}
                                {liveGroups.length > 0
                                    ? liveGroups.map((group) => (
                                          <div
                                              key={group.id}
                                              className="flex items-center justify-between p-3 bg-background/50 rounded-lg mb-2 last:mb-0"
                                          >
                                              <div>
                                                  <p className="font-medium text-sm">
                                                      {group.name}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground">
                                                      {group.memberCount}{" "}
                                                      participants
                                                  </p>
                                              </div>
                                              <Button
                                                  size="sm"
                                                  onClick={() =>
                                                      handleJoinGroup(group)
                                                  }
                                                  className="bg-red-500 hover:bg-red-600 text-white"
                                              >
                                                  Join Now
                                              </Button>
                                          </div>
                                      ))
                                    : null}
                            </CardContent>
                        </Card>

                        {/* Upcoming Sessions */}
                        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-200 dark:border-blue-800">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <Clock className="w-4 h-4" />
                                    Upcoming Sessions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {upcomingGroups.map((group) => (
                                    <div
                                        key={group.id}
                                        className="flex items-center justify-between p-3 bg-background/50 rounded-lg mb-2 last:mb-0"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">
                                                {group.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatNextMeeting(
                                                    group.nextMeetingDate,
                                                    group.meetingTime
                                                )}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                handleJoinGroup(group)
                                            }
                                        >
                                            {group.isMember ? "Joined" : "Join"}
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </section>

            {/* Filters Section */}
            <section className="px-4 pb-8">
                <div className="container mx-auto max-w-6xl">
                    <motion.div
                        className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border shadow-lg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="Search support groups..."
                                    className="pl-10 bg-background/50"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                />
                            </div>

                            <div className="flex gap-3 items-center">
                                <Filter className="w-4 h-4 text-muted-foreground" />
                                <Select
                                    value={selectedTag}
                                    onValueChange={setSelectedTag}
                                >
                                    <SelectTrigger className="w-52 bg-background/50">
                                        <SelectValue placeholder="Filter by tag" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Tags
                                        </SelectItem>
                                        {allTags.map((tag) => (
                                            <SelectItem key={tag} value={tag}>
                                                {tag}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {searchQuery || selectedTag !== "all" ? (
                            <div className="mt-3 text-sm text-muted-foreground">
                                Showing {filteredGroups.length} of{" "}
                                {supportGroups.length} groups
                            </div>
                        ) : null}
                    </motion.div>
                </div>
            </section>

            {/* Support Groups Grid */}
            <section className="px-4 pb-16">
                <div className="container mx-auto max-w-6xl">
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {filteredGroups.map((group) => {
                            const gradient = getGradientForGroup(group.id);
                            const typeLabel =
                                group.type === "WEEKLY"
                                    ? "Weekly"
                                    : group.type === "BIWEEKLY"
                                    ? "Bi-weekly"
                                    : group.type === "MONTHLY"
                                    ? "Monthly"
                                    : group.type;

                            return (
                                <motion.div
                                    key={group.id}
                                    variants={cardVariants}
                                >
                                    <Card className="flex flex-col h-full bg-card/50 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                                        {/* Gradient Header */}
                                        <div
                                            className={`h-32 bg-gradient-to-br ${gradient} relative flex-shrink-0`}
                                        >
                                            <div className="absolute inset-0 bg-black/10" />
                                            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                                                {group.isLive && (
                                                    <Badge className="bg-red-500 text-white animate-pulse">
                                                        <div className="w-2 h-2 bg-white rounded-full mr-1" />
                                                        LIVE
                                                    </Badge>
                                                )}
                                                {group.isStartingSoon && (
                                                    <Badge className="bg-orange-500 text-white">
                                                        Starting Soon
                                                    </Badge>
                                                )}
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-white/20 text-white border-0"
                                                >
                                                    {typeLabel}
                                                </Badge>
                                            </div>
                                        </div>

                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-xl leading-tight">
                                                {group.name}
                                            </CardTitle>
                                            {group.description && (
                                                <p className="text-muted-foreground text-sm leading-relaxed mt-2 line-clamp-2">
                                                    {group.description}
                                                </p>
                                            )}
                                        </CardHeader>

                                        <CardContent className="space-y-4 flex-1 flex flex-col">
                                            {/* Stats */}
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-muted-foreground" />
                                                    <span>
                                                        {group.memberCount}{" "}
                                                        members
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-xs">
                                                        {formatNextMeeting(
                                                            group.nextMeetingDate,
                                                            group.meetingTime
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Tags */}
                                            <div className="flex flex-wrap gap-1">
                                                {group.tags
                                                    .slice(0, 4)
                                                    .map((tag) => (
                                                        <Badge
                                                            key={tag}
                                                            variant="secondary"
                                                            className="text-xs"
                                                        >
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                {group.tags.length > 4 && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        +{group.tags.length - 4}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Spacer to push button to bottom */}
                                            <div className="flex-1" />

                                            {/* Join Button */}
                                            <div className="mt-auto">
                                                <Button
                                                    onClick={() =>
                                                        handleJoinGroup(group)
                                                    }
                                                    className={`w-full ${
                                                        group.isLive
                                                            ? "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
                                                            : group.isMember
                                                            ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                                            : "bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700"
                                                    } text-white border-0 group-hover:scale-105 transition-transform`}
                                                    variant={
                                                        group.isMember
                                                            ? "secondary"
                                                            : "default"
                                                    }
                                                >
                                                    <Video className="w-4 h-4 mr-2" />
                                                    {group.isLive
                                                        ? "Join Live Session"
                                                        : group.isMember
                                                        ? "Joined"
                                                        : "Join Group"}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </motion.div>

                    {filteredGroups.length === 0 && (
                        <motion.div
                            className="text-center py-16"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">
                                No support groups found
                            </h3>
                            <p className="text-muted-foreground">
                                Try adjusting your search criteria or browse all
                                available groups.
                            </p>
                        </motion.div>
                    )}
                </div>
            </section>

            {/* Floating Action Button for creating new support groups */}
            <div className="fixed bottom-8 right-8 z-50">
                <Button
                    size="lg"
                    className="rounded-full w-14 h-14 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() =>
                        toast.info("Create Support Group feature coming soon!")
                    }
                >
                    <Users className="w-6 h-6" />
                </Button>
            </div>
        </div>
    );
}
