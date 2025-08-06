"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    Phone,
    Users,
    MessageSquare,
    Share,
    Settings,
    Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

// This would typically come from your support groups data
const getSupportGroupById = (id: string) => {
    const groups = {
        "1": {
            name: "Anxiety & Stress Management",
            facilitator: "Dr. Sarah Johnson",
            category: "Mental Health",
            gradient: "from-blue-500 to-purple-600",
        },
        "2": {
            name: "Depression Support Circle",
            facilitator: "Michael Chen",
            category: "Mental Health",
            gradient: "from-green-500 to-teal-600",
        },
        "3": {
            name: "Mindfulness & Meditation",
            facilitator: "Emma Rodriguez",
            category: "Wellness",
            gradient: "from-purple-500 to-pink-600",
        },
        "4": {
            name: "Grief & Loss Support",
            facilitator: "Rev. David Park",
            category: "Life Transitions",
            gradient: "from-amber-500 to-orange-600",
        },
        "5": {
            name: "Young Adults Support Network",
            facilitator: "Alex Thompson",
            category: "Age-Specific",
            gradient: "from-indigo-500 to-blue-600",
        },
        "6": {
            name: "Creative Therapy Workshop",
            facilitator: "Luna Martinez",
            category: "Creative Arts",
            gradient: "from-pink-500 to-rose-600",
        },
    };
    return groups[id as keyof typeof groups];
};

export default function MeetingRoomPage() {
    const params = useParams();
    const groupId = params?.id as string;
    const group = groupId ? getSupportGroupById(groupId) : null;

    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [isConnecting, setIsConnecting] = useState(true);
    const [participantCount, setParticipantCount] = useState(1);

    useEffect(() => {
        // Simulate connection process
        const timer = setTimeout(() => {
            setIsConnecting(false);
            setParticipantCount(Math.floor(Math.random() * 8) + 2); // 2-10 participants
            toast.success("Connected to support group session!");
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    if (!group) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="p-8 text-center">
                    <CardHeader>
                        <CardTitle>Support Group Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            The support group you&apos;re looking for
                            doesn&apos;t exist.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleToggleVideo = () => {
        setIsVideoOn(!isVideoOn);
        toast.info(isVideoOn ? "Video turned off" : "Video turned on");
    };

    const handleToggleAudio = () => {
        setIsAudioOn(!isAudioOn);
        toast.info(isAudioOn ? "Microphone muted" : "Microphone unmuted");
    };

    const handleLeaveCall = () => {
        toast.success("Left the support group session");
        window.history.back();
    };

    if (isConnecting) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-primary/5">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div
                        className={`w-24 h-24 rounded-full bg-gradient-to-br ${group.gradient} mx-auto mb-6 flex items-center justify-center`}
                    >
                        <Heart className="w-12 h-12 text-white animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Connecting...</h2>
                    <p className="text-muted-foreground mb-4">
                        Joining {group.name}
                    </p>
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            {/* Header */}
            <header className="bg-black/50 backdrop-blur-sm border-b border-gray-700 p-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-10 h-10 rounded-full bg-gradient-to-br ${group.gradient} flex items-center justify-center`}
                        >
                            <Heart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-semibold">{group.name}</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <span>Facilitated by {group.facilitator}</span>
                                <Badge
                                    variant="secondary"
                                    className="bg-green-500/20 text-green-400 border-green-500/30"
                                >
                                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1" />
                                    LIVE
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4" />
                            <span>{participantCount} participants</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex">
                {/* Video Grid */}
                <div className="flex-1 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
                        {/* Main Speaker / Facilitator */}
                        <motion.div
                            className="lg:col-span-2 bg-gray-800 rounded-lg overflow-hidden relative"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                                <div className="text-center">
                                    <Avatar className="w-24 h-24 mx-auto mb-4">
                                        <AvatarImage src="/avatars/facilitator.jpg" />
                                        <AvatarFallback className="text-2xl">
                                            {group.facilitator
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")}
                                        </AvatarFallback>
                                    </Avatar>
                                    <p className="font-medium">
                                        {group.facilitator}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        Facilitator
                                    </p>
                                </div>
                            </div>
                            <div className="absolute bottom-4 left-4">
                                <Badge className="bg-primary/20 text-primary border-primary/30">
                                    Facilitator
                                </Badge>
                            </div>
                        </motion.div>

                        {/* Participants */}
                        {Array.from({
                            length: Math.min(participantCount - 1, 5),
                        }).map((_, index) => (
                            <motion.div
                                key={index}
                                className="bg-gray-800 rounded-lg overflow-hidden relative aspect-video"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    duration: 0.5,
                                    delay: index * 0.1,
                                }}
                            >
                                <div className="h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                                    <div className="text-center">
                                        <Avatar className="w-16 h-16 mx-auto mb-2">
                                            <AvatarFallback>
                                                P{index + 1}
                                            </AvatarFallback>
                                        </Avatar>
                                        <p className="text-sm">
                                            Participant {index + 1}
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute bottom-2 left-2">
                                    <div className="flex items-center gap-1">
                                        {Math.random() > 0.5 ? (
                                            <Mic className="w-3 h-3 text-green-400" />
                                        ) : (
                                            <MicOff className="w-3 h-3 text-red-400" />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Your Video */}
                        <motion.div
                            className="bg-gray-800 rounded-lg overflow-hidden relative aspect-video border-2 border-primary/50"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <div className="h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <div className="text-center">
                                    <Avatar className="w-16 h-16 mx-auto mb-2">
                                        <AvatarFallback>You</AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm">You</p>
                                </div>
                            </div>
                            <div className="absolute bottom-2 left-2">
                                <Badge variant="outline" className="text-xs">
                                    You
                                </Badge>
                            </div>
                            {!isVideoOn && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                    <VideoOff className="w-8 h-8 text-gray-400" />
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>

                {/* Chat Sidebar */}
                <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-700">
                        <h3 className="font-semibold flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Group Chat
                        </h3>
                    </div>

                    <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                        <div className="text-sm">
                            <p className="text-gray-400 text-xs mb-1">
                                Facilitator
                            </p>
                            <p className="bg-primary/20 rounded-lg p-2">
                                Welcome everyone! Let&apos;s start with a moment
                                of mindful breathing together.
                            </p>
                        </div>

                        <div className="text-sm">
                            <p className="text-gray-400 text-xs mb-1">
                                Participant 1
                            </p>
                            <p className="bg-gray-700 rounded-lg p-2">
                                Thank you for creating this safe space 🙏
                            </p>
                        </div>

                        <div className="text-sm">
                            <p className="text-gray-400 text-xs mb-1">
                                Participant 2
                            </p>
                            <p className="bg-gray-700 rounded-lg p-2">
                                Feeling grateful to be here with all of you
                            </p>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-700">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Type a supportive message..."
                                className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90"
                            >
                                Send
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Controls */}
            <div className="bg-black/50 backdrop-blur-sm border-t border-gray-700 p-4">
                <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
                    <Button
                        variant={isAudioOn ? "default" : "destructive"}
                        size="lg"
                        className="rounded-full w-12 h-12 p-0"
                        onClick={handleToggleAudio}
                    >
                        {isAudioOn ? (
                            <Mic className="w-5 h-5" />
                        ) : (
                            <MicOff className="w-5 h-5" />
                        )}
                    </Button>

                    <Button
                        variant={isVideoOn ? "default" : "destructive"}
                        size="lg"
                        className="rounded-full w-12 h-12 p-0"
                        onClick={handleToggleVideo}
                    >
                        {isVideoOn ? (
                            <Video className="w-5 h-5" />
                        ) : (
                            <VideoOff className="w-5 h-5" />
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        className="rounded-full w-12 h-12 p-0"
                    >
                        <Share className="w-5 h-5" />
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        className="rounded-full w-12 h-12 p-0"
                    >
                        <Settings className="w-5 h-5" />
                    </Button>

                    <Button
                        variant="destructive"
                        size="lg"
                        className="rounded-full px-6"
                        onClick={handleLeaveCall}
                    >
                        <Phone className="w-5 h-5 mr-2" />
                        Leave
                    </Button>
                </div>
            </div>
        </div>
    );
}
