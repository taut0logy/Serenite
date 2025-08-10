"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
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
    Calendar,
    Star,
    Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useAuth } from "@/hooks/use-auth";

// Types
interface Facilitator {
    name: string;
    image: string;
    title: string;
}

interface SupportGroup {
    id: number;
    name: string;
    description: string;
    category: string;
    members: number;
    onlineMembers: number;
    nextSession: string;
    difficulty: string;
    tags: string[];
    facilitator: Facilitator;
    gradient: string;
    sessions: string;
    rating: number;
    isLive: boolean;
}

// Dummy data for support groups
const supportGroups: SupportGroup[] = [
    {
        id: 1,
        name: "Anxiety & Stress Management",
        description:
            "A safe space to share experiences and coping strategies for managing anxiety and stress in daily life.",
        category: "Mental Health",
        members: 24,
        onlineMembers: 8,
        nextSession: "Today, 3:00 PM",
        difficulty: "Beginner Friendly",
        tags: ["anxiety", "stress", "mindfulness"],
        facilitator: {
            name: "Dr. Sarah Johnson",
            image: "/avatars/avatar1.png",
            title: "Licensed Therapist",
        },
        gradient: "from-blue-500 to-purple-600",
        sessions: "Weekly",
        rating: 4.9,
        isLive: false,
    },
    {
        id: 2,
        name: "Depression Support Circle",
        description:
            "Connect with others who understand the journey. Share stories, find hope, and build meaningful connections.",
        category: "Mental Health",
        members: 18,
        onlineMembers: 5,
        nextSession: "Tomorrow, 7:00 PM",
        difficulty: "All Levels",
        tags: ["depression", "support", "recovery"],
        facilitator: {
            name: "Michael Chen",
            image: "/avatars/avatar2.jpg",
            title: "Peer Counselor",
        },
        gradient: "from-green-500 to-teal-600",
        sessions: "Bi-weekly",
        rating: 4.8,
        isLive: false,
    },
    {
        id: 12,
        name: "Mindfulness & Meditation",
        description:
            "Learn and practice mindfulness techniques together. Perfect for beginners and experienced practitioners.",
        category: "Wellness",
        members: 31,
        onlineMembers: 12,
        nextSession: "Live Now",
        difficulty: "All Levels",
        tags: ["mindfulness", "meditation", "wellness"],
        facilitator: {
            name: "Emma Rodriguez",
            image: "/avatars/avatar3.jpg",
            title: "Mindfulness Coach",
        },
        gradient: "from-purple-500 to-pink-600",
        sessions: "Daily",
        rating: 4.9,
        isLive: true,
    },
    {
        id: 4,
        name: "Grief & Loss Support",
        description:
            "A compassionate community for those navigating grief. Honor memories while finding ways to heal together.",
        category: "Life Transitions",
        members: 15,
        onlineMembers: 3,
        nextSession: "Friday, 6:00 PM",
        difficulty: "Supportive",
        tags: ["grief", "loss", "healing"],
        facilitator: {
            name: "Rev. David Park",
            image: "/avatars/default.jpg",
            title: "Grief Counselor",
        },
        gradient: "from-amber-500 to-orange-600",
        sessions: "Weekly",
        rating: 4.7,
        isLive: false,
    },
    {
        id: 5,
        name: "Young Adults Support Network",
        description:
            "Navigate the challenges of early adulthood together. Career, relationships, and personal growth topics.",
        category: "Age-Specific",
        members: 42,
        onlineMembers: 15,
        nextSession: "Wednesday, 8:00 PM",
        difficulty: "Peer-to-Peer",
        tags: ["young adults", "career", "relationships"],
        facilitator: {
            name: "Alex Thompson",
            image: "/avatars/avatar1.png",
            title: "Life Coach",
        },
        gradient: "from-indigo-500 to-blue-600",
        sessions: "Weekly",
        rating: 4.6,
        isLive: false,
    },
    {
        id: 6,
        name: "Creative Therapy Workshop",
        description:
            "Express yourself through art, music, and writing. No experience needed - just bring your authentic self.",
        category: "Creative Arts",
        members: 28,
        onlineMembers: 9,
        nextSession: "Saturday, 2:00 PM",
        difficulty: "Creative",
        tags: ["art therapy", "creativity", "expression"],
        facilitator: {
            name: "Luna Martinez",
            image: "/avatars/avatar2.jpg",
            title: "Art Therapist",
        },
        gradient: "from-pink-500 to-rose-600",
        sessions: "Weekly",
        rating: 4.8,
        isLive: false,
    },
];

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

export default function DashboardPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedDifficulty, setSelectedDifficulty] = useState("all");
    const router = useRouter();
    const client = useStreamVideoClient();
    const { user } = useAuth();

    // Filter support groups based on search and filters
    const filteredGroups = supportGroups.filter((group) => {
        const matchesSearch =
            group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            group.description
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            group.tags.some((tag) =>
                tag.toLowerCase().includes(searchQuery.toLowerCase())
            );

        const matchesCategory =
            selectedCategory === "all" || group.category === selectedCategory;
        const matchesDifficulty =
            selectedDifficulty === "all" ||
            group.difficulty === selectedDifficulty;

        return matchesSearch && matchesCategory && matchesDifficulty;
    });

    const handleJoinGroup = async (group: SupportGroup) => {
        if (!client || !user) {
            toast.error("Please sign in to join a support group");
            return;
        }

        try {
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
                            facilitator: group.facilitator.name,
                            category: group.category,
                            supportGroupId: group.id,
                        },
                    },
                });

                toast.dismiss();
                toast.success(`Joining ${group.name}!`);
                router.push(`/meeting/${call.id}`);
            } else {
                // For scheduled sessions, show confirmation and maybe create a scheduled meeting
                toast.success(
                    `You've joined ${group.name}! You'll be notified before the next session.`
                );

                // const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
                // const call = client.call("default", `support-group-${group.id}-scheduled`);
                // await call.getOrCreate({
                //   data: {
                //     starts_at: scheduledTime.toISOString(),
                //     custom: {
                //       description: `${group.name} - Scheduled Support Group Session`,
                //       facilitator: group.facilitator.name,
                //       category: group.category,
                //       supportGroupId: group.id,
                //     },
                //   },
                // });
            }
        } catch (error) {
            console.error("Error joining support group:", error);
            toast.error("Failed to join support group. Please try again.");
        }
    };

    const categories = [
        "all",
        "Mental Health",
        "Wellness",
        "Life Transitions",
        "Age-Specific",
        "Creative Arts",
    ];
    const difficulties = [
        "all",
        "Beginner Friendly",
        "All Levels",
        "Supportive",
        "Peer-to-Peer",
        "Creative",
    ];

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

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">
                                    6
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Active Groups
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">
                                    158
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Total Members
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">
                                    1
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Live Now
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Quick Access - Live & Upcoming Sessions */}
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
                                {supportGroups
                                    .filter((group) => group.isLive)
                                    .map((group) => (
                                        <div
                                            key={group.id}
                                            className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {group.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {group.onlineMembers}{" "}
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
                                    ))}
                                {supportGroups.filter((group) => group.isLive)
                                    .length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No live sessions right now
                                    </p>
                                )}
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
                                {supportGroups
                                    .filter((group) => !group.isLive)
                                    .slice(0, 3)
                                    .map((group) => (
                                        <div
                                            key={group.id}
                                            className="flex items-center justify-between p-3 bg-background/50 rounded-lg mb-2 last:mb-0"
                                        >
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {group.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {group.nextSession}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    handleJoinGroup(group)
                                                }
                                            >
                                                Join
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
                                    value={selectedCategory}
                                    onValueChange={setSelectedCategory}
                                >
                                    <SelectTrigger className="w-40 bg-background/50">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem
                                                key={category}
                                                value={category}
                                            >
                                                {category === "all"
                                                    ? "All Categories"
                                                    : category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={selectedDifficulty}
                                    onValueChange={setSelectedDifficulty}
                                >
                                    <SelectTrigger className="w-40 bg-background/50">
                                        <SelectValue placeholder="Level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {difficulties.map((difficulty) => (
                                            <SelectItem
                                                key={difficulty}
                                                value={difficulty}
                                            >
                                                {difficulty === "all"
                                                    ? "All Levels"
                                                    : difficulty}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
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
                        {filteredGroups.map((group) => (
                            <motion.div key={group.id} variants={cardVariants}>
                                <Card className="h-full bg-card/50 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                                    {/* Gradient Header */}
                                    <div
                                        className={`h-32 bg-gradient-to-br ${group.gradient} relative`}
                                    >
                                        <div className="absolute inset-0 bg-black/10" />
                                        <div className="absolute top-4 left-4 flex items-center gap-2">
                                            {group.isLive && (
                                                <Badge className="bg-red-500 text-white animate-pulse">
                                                    <div className="w-2 h-2 bg-white rounded-full mr-1" />
                                                    LIVE
                                                </Badge>
                                            )}
                                            <Badge
                                                variant="secondary"
                                                className="bg-white/20 text-white border-0"
                                            >
                                                {group.category}
                                            </Badge>
                                        </div>

                                        <div className="absolute top-4 right-4">
                                            <div className="flex items-center gap-1 text-white">
                                                <Star className="w-4 h-4 fill-current" />
                                                <span className="text-sm font-medium">
                                                    {group.rating}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-4 left-4">
                                            <Badge
                                                variant="outline"
                                                className="bg-white/20 text-white border-white/30"
                                            >
                                                {group.difficulty}
                                            </Badge>
                                        </div>
                                    </div>

                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="text-xl leading-tight">
                                                {group.name}
                                            </CardTitle>
                                        </div>
                                        <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                                            {group.description}
                                        </p>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        {/* Facilitator */}
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage
                                                    src={
                                                        group.facilitator.image
                                                    }
                                                />
                                                <AvatarFallback>
                                                    {group.facilitator.name
                                                        .split(" ")
                                                        .map((n) => n[0])
                                                        .join("")}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {group.facilitator.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {group.facilitator.title}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-muted-foreground" />
                                                <span>
                                                    {group.members} members
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                <span>
                                                    {group.onlineMembers} online
                                                </span>
                                            </div>
                                        </div>

                                        {/* Next Session */}
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            <span
                                                className={
                                                    group.isLive
                                                        ? "text-red-500 font-medium"
                                                        : ""
                                                }
                                            >
                                                {group.nextSession}
                                            </span>
                                        </div>

                                        {/* Sessions Frequency */}
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span>
                                                {group.sessions} sessions
                                            </span>
                                        </div>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-1">
                                            {group.tags.map((tag) => (
                                                <Badge
                                                    key={tag}
                                                    variant="secondary"
                                                    className="text-xs"
                                                >
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>

                                        {/* Join Button */}
                                        <Button
                                            onClick={() =>
                                                handleJoinGroup(group)
                                            }
                                            className={`w-full ${
                                                group.isLive
                                                    ? "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
                                                    : "bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700"
                                            } text-white border-0 group-hover:scale-105 transition-transform`}
                                        >
                                            <Video className="w-4 h-4 mr-2" />
                                            {group.isLive
                                                ? "Join Live Session"
                                                : "Join Group"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
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
