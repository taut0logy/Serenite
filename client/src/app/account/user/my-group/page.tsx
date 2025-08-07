"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    Calendar,
    MessageCircle,
    Video,
    Mic,
    Settings,
    Bell,
    Lock,
    Shield,
} from "lucide-react";

interface SupportGroup {
    id: string;
    name: string;
    icon: string;
    members: number;
    activityLevel: number;
    focusTags: string[];
    lastActivity: Date;
    description: string;
    privacy: "public" | "private";
    supportType: "text" | "voice" | "video";
    owner: {
        name: string;
        avatar: string;
        reputation: number;
    };
    nextMeeting?: string;
    helpedPercentage: number;
}

const groups: SupportGroup[] = [
    {
        id: "1",
        name: "Mindful Living Circle",
        icon: "/group-icons/mindful.png",
        members: 234,
        activityLevel: 85,
        focusTags: ["Meditation", "Anxiety", "Wellness"],
        lastActivity: new Date(),
        description:
            "A nurturing space for practicing mindfulness and supporting mental well-being",
        privacy: "public",
        supportType: "video",
        owner: {
            name: "Sarah Chen",
            avatar: "/avatars/sarah.jpg",
            reputation: 98,
        },
        nextMeeting: "Tomorrow at 7 PM",
        helpedPercentage: 92,
    },
    // Add more groups...
];

export default function MyGroups() {
    const [viewType, setViewType] = useState<"grid" | "list">("list");
    const [isLoading, setIsLoading] = useState(false);

    const getActivityColor = (level: number) => {
        if (level >= 80)
            return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
        if (level >= 50)
            return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300";
        return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#f0f4ff] to-[#f9fafb] dark:from-[#1e1b4b] dark:to-[#171923]">
            <div className="container mx-auto py-8 px-4">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold font-['Space_Grotesk'] tracking-tight text-gray-900 dark:text-white">
                        Support Communities
                    </h1>
                    <div className="flex items-center justify-between mt-6">
                        <p className="text-muted-foreground font-['Inter']">
                            Your safe spaces for growth and connection
                        </p>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setViewType(
                                        viewType === "grid" ? "list" : "grid"
                                    )
                                }
                            >
                                {viewType === "grid"
                                    ? "List View"
                                    : "Grid View"}
                            </Button>
                            <Button>Create Group</Button>
                        </div>
                    </div>
                </header>

                <AnimatePresence>
                    <motion.div
                        className={`grid ${
                            viewType === "grid"
                                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                                : "grid-cols-1"
                        } gap-6`}
                        layout
                    >
                        {groups.map((group) => (
                            <motion.div
                                key={group.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                whileHover={{ scale: 1.02 }}
                                className="group"
                            >
                                <HoverCard>
                                    <HoverCardTrigger asChild>
                                        <Card className="backdrop-blur-sm bg-white/90 dark:bg-black/20 border-none shadow-lg hover:shadow-xl transition-all duration-300">
                                            <CardContent className="p-6">
                                                <div className="flex items-start gap-4">
                                                    <Avatar className="h-12 w-12 ring-2 ring-offset-2 ring-blue-500/20">
                                                        <AvatarImage
                                                            src={group.icon}
                                                            alt={group.name}
                                                        />
                                                        <AvatarFallback>
                                                            {group.name[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-xl font-semibold font-['Space_Grotesk']">
                                                                {group.name}
                                                            </h3>
                                                            {group.privacy ===
                                                                "private" && (
                                                                <Lock className="h-4 w-4 text-purple-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {group.focusTags.map(
                                                                (tag) => (
                                                                    <Badge
                                                                        key={
                                                                            tag
                                                                        }
                                                                        variant="secondary"
                                                                        className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                                                    >
                                                                        {tag}
                                                                    </Badge>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={`ml-auto ${getActivityColor(
                                                            group.activityLevel
                                                        )}`}
                                                    >
                                                        {group.activityLevel}%
                                                        Active
                                                    </Badge>
                                                </div>

                                                <div className="mt-4">
                                                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-4 w-4" />
                                                            <span>
                                                                {group.members}{" "}
                                                                members
                                                            </span>
                                                        </div>
                                                        {group.supportType ===
                                                            "video" && (
                                                            <Video className="h-4 w-4" />
                                                        )}
                                                        {group.supportType ===
                                                            "voice" && (
                                                            <Mic className="h-4 w-4" />
                                                        )}
                                                        <Shield
                                                            className="h-4 w-4 text-green-500"
                                                            title="Actively Moderated"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <div className="text-sm text-muted-foreground mb-2">
                                                        Member Support Level
                                                    </div>
                                                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full bg-blue-500 dark:bg-blue-400"
                                                            initial={{
                                                                width: 0,
                                                            }}
                                                            animate={{
                                                                width: `${group.helpedPercentage}%`,
                                                            }}
                                                            transition={{
                                                                duration: 1,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </HoverCardTrigger>

                                    <HoverCardContent className="w-80 p-0 backdrop-blur-lg bg-white/95 dark:bg-gray-900/95 border-none shadow-xl">
                                        <div className="p-6">
                                            <div className="flex items-center gap-4 mb-4">
                                                <Avatar>
                                                    <AvatarImage
                                                        src={group.owner.avatar}
                                                    />
                                                    <AvatarFallback>
                                                        {group.owner.name[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold">
                                                        Led by{" "}
                                                        {group.owner.name}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {group.owner.reputation}
                                                        % positive feedback
                                                    </p>
                                                </div>
                                            </div>

                                            <p className="text-sm mb-4">
                                                {group.description}
                                            </p>

                                            {group.nextMeeting && (
                                                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg mb-4">
                                                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                                        <Calendar className="h-4 w-4" />
                                                        <span className="text-sm font-medium">
                                                            Next Meeting:{" "}
                                                            {group.nextMeeting}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="flex-1"
                                                >
                                                    Join Session
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Bell className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Settings className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </HoverCardContent>
                                </HoverCard>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
