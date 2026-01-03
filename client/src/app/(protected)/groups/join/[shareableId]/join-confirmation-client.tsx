"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Users,
    Clock,
    Calendar,
    Shield,
    Heart,
    MessageCircle,
    AlertTriangle,
    ArrowLeft,
    UserPlus,
    CheckCircle,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { joinSupportGroup } from "@/actions/support-group.actions";
import type { SupportGroupRecommendation } from "@/actions/support-group.actions";
import { formatNextMeeting, getGradientForGroup } from "@/lib/support-group-utils";

interface JoinConfirmationClientProps {
    group: SupportGroupRecommendation;
    isAlreadyMember: boolean;
    hasReachedMax: boolean;
    isFull: boolean;
}

const COMMUNITY_GUIDELINES = [
    {
        icon: Heart,
        title: "Be Supportive",
        description: "Listen without judgment, offer encouragement, and celebrate each other's progress.",
    },
    {
        icon: Shield,
        title: "Maintain Confidentiality",
        description: "What's shared in the group stays in the group. Respect everyone's privacy.",
    },
    {
        icon: MessageCircle,
        title: "Communicate Respectfully",
        description: "Use kind words, avoid interrupting, and be mindful of different perspectives.",
    },
    {
        icon: Users,
        title: "Participate Regularly",
        description: "Consistent attendance strengthens the group bond and your own healing journey.",
    },
];

export function JoinConfirmationClient({
    group,
    isAlreadyMember,
    hasReachedMax,
    isFull,
}: JoinConfirmationClientProps) {
    const router = useRouter();
    const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    const canJoin = !isAlreadyMember && !hasReachedMax && !isFull && agreedToGuidelines;
    const gradient = getGradientForGroup(group.id);

    const handleJoin = async () => {
        if (!canJoin) return;

        setIsJoining(true);
        try {
            const result = await joinSupportGroup(group.id);
            if (result.success) {
                toast.success(`Welcome to ${group.name}!`);
                router.push("/dashboard");
            } else {
                toast.error(result.error || "Failed to join group");
            }
        } catch (error) {
            console.error("Error joining group:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
            <div className="container mx-auto max-w-2xl">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                {/* Group Header Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="overflow-hidden mb-6">
                        <div className={`h-32 bg-gradient-to-br ${gradient} relative`}>
                            <div className="absolute inset-0 bg-black/10" />
                            <div className="absolute bottom-4 left-4 right-4">
                                <Badge className="bg-white/20 text-white border-0 mb-2">
                                    {group.type}
                                </Badge>
                                <h1 className="text-2xl font-bold text-white drop-shadow-md">
                                    {group.name}
                                </h1>
                            </div>
                        </div>
                        <CardContent className="pt-4 space-y-4">
                            {group.description && (
                                <p className="text-muted-foreground">{group.description}</p>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span>{group.memberCount}/{group.maxMembers} members</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span>{group.meetingTime || "TBD"}</span>
                                </div>
                                <div className="flex items-center gap-2 col-span-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>Next: {formatNextMeeting(group.nextMeetingDate, group.meetingTime)}</span>
                                </div>
                            </div>

                            {group.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {group.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Status Alerts */}
                {isAlreadyMember && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                            <CardContent className="py-4 flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <p className="text-green-700 dark:text-green-400">
                                    You&apos;re already a member of this group!
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {hasReachedMax && !isAlreadyMember && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                            <CardContent className="py-4 flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                                <p className="text-orange-700 dark:text-orange-400">
                                    You&apos;ve reached the maximum of 3 groups. Leave a group to join this one.
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {isFull && !isAlreadyMember && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                            <CardContent className="py-4 flex items-center gap-3">
                                <XCircle className="w-5 h-5 text-red-600" />
                                <p className="text-red-700 dark:text-red-400">
                                    This group is currently full. Please check back later.
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Community Guidelines */}
                {!isAlreadyMember && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    Community Guidelines
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    By joining, you agree to uphold these principles to create a safe space for everyone:
                                </p>

                                <div className="space-y-4">
                                    {COMMUNITY_GUIDELINES.map((guideline, index) => (
                                        <div key={index} className="flex gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <guideline.icon className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-sm">{guideline.title}</h4>
                                                <p className="text-xs text-muted-foreground">{guideline.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center space-x-3 pt-4 border-t">
                                    <Checkbox
                                        id="agree"
                                        checked={agreedToGuidelines}
                                        onCheckedChange={(checked) => setAgreedToGuidelines(checked === true)}
                                        disabled={hasReachedMax || isFull}
                                    />
                                    <label
                                        htmlFor="agree"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        I agree to follow the community guidelines
                                    </label>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex gap-3"
                >
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard")}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    {!isAlreadyMember && (
                        <Button
                            onClick={handleJoin}
                            disabled={!canJoin || isJoining}
                            className="flex-1"
                        >
                            {isJoining ? (
                                "Joining..."
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Join Group
                                </>
                            )}
                        </Button>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
