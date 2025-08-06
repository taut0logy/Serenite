"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Copy,
    Share,
    Mail,
    MessageSquare,
    Calendar,
    Clock,
    Users,
    Link as LinkIcon,
    Check,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface MeetingInviteProps {
    roomId: string;
    roomName?: string;
    hostName?: string;
    scheduledTime?: Date;
    onClose?: () => void;
}

export function MeetingInvite({
    roomId,
    roomName = "Video Meeting",
    hostName = "Host",
    scheduledTime,
    onClose,
}: MeetingInviteProps) {
    const [copied, setCopied] = useState(false);
    const [emails, setEmails] = useState("");
    const [message, setMessage] = useState("");

    const meetingUrl = `${
        typeof window !== "undefined" ? window.location.origin : ""
    }/room/${roomId}`;

    const defaultMessage = `Hi there!

You're invited to join a video meeting: ${roomName}

Meeting Details:
${
    scheduledTime
        ? `Date & Time: ${format(scheduledTime, "PPP p")}`
        : "Start time: Now"
}
Meeting ID: ${roomId}
Host: ${hostName}

Join the meeting:
${meetingUrl}

See you there!`;

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success("Copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy to clipboard");
        }
    };

    const shareNative = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: roomName,
                    text: `Join me for a video meeting: ${roomName}`,
                    url: meetingUrl,
                });
            } catch {
                copyToClipboard(meetingUrl);
            }
        } else {
            copyToClipboard(meetingUrl);
        }
    };

    const sendEmailInvite = () => {
        const subject = encodeURIComponent(`Invitation: ${roomName}`);
        const body = encodeURIComponent(message || defaultMessage);
        const mailto = `mailto:${emails}?subject=${subject}&body=${body}`;
        window.open(mailto);
    };

    const shareToWhatsApp = () => {
        const text = encodeURIComponent(
            `Join me for a video meeting: ${roomName}\n\n${meetingUrl}`
        );
        const whatsappUrl = `https://wa.me/?text=${text}`;
        window.open(whatsappUrl, "_blank");
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Users className="h-5 w-5" />
                        <span>Invite People to Meeting</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Meeting Info */}
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <Badge
                                variant="outline"
                                className="flex items-center space-x-1"
                            >
                                <Calendar className="h-3 w-3" />
                                <span>{roomName}</span>
                            </Badge>
                            {scheduledTime && (
                                <Badge
                                    variant="secondary"
                                    className="flex items-center space-x-1"
                                >
                                    <Clock className="h-3 w-3" />
                                    <span>
                                        {format(scheduledTime, "MMM d, h:mm a")}
                                    </span>
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Meeting ID:{" "}
                            <code className="bg-muted px-1 rounded">
                                {roomId}
                            </code>
                        </p>
                    </div>

                    <Separator />

                    {/* Quick Share */}
                    <div className="space-y-3">
                        <Label>Quick Share</Label>
                        <div className="flex items-center space-x-2">
                            <Input
                                readOnly
                                value={meetingUrl}
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(meetingUrl)}
                                className="flex items-center space-x-1"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                                <span>{copied ? "Copied" : "Copy"}</span>
                            </Button>
                        </div>

                        <div className="flex space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={shareNative}
                                className="flex-1"
                            >
                                <Share className="h-4 w-4 mr-2" />
                                Share
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={shareToWhatsApp}
                                className="flex-1"
                            >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                WhatsApp
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Email Invite */}
                    <div className="space-y-3">
                        <Label>Send Email Invitations</Label>
                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="emails" className="text-sm">
                                    Email addresses (comma separated)
                                </Label>
                                <Input
                                    id="emails"
                                    value={emails}
                                    onChange={(e) => setEmails(e.target.value)}
                                    placeholder="email1@example.com, email2@example.com"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="message" className="text-sm">
                                    Message
                                </Label>
                                <Textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={defaultMessage}
                                    rows={8}
                                    className="mt-1"
                                />
                            </div>

                            <Button
                                onClick={sendEmailInvite}
                                disabled={!emails.trim()}
                                className="w-full"
                            >
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email Invitations
                            </Button>
                        </div>
                    </div>

                    {/* Link Only */}
                    <div className="space-y-3">
                        <Label>Meeting Link</Label>
                        <Card className="bg-muted/50">
                            <CardContent className="p-4">
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-sm">
                                        <LinkIcon className="h-4 w-4" />
                                        <span className="font-medium">
                                            Direct Link
                                        </span>
                                    </div>
                                    <code className="block text-xs bg-background p-2 rounded border break-all">
                                        {meetingUrl}
                                    </code>
                                    <p className="text-xs text-muted-foreground">
                                        Share this link with anyone you want to
                                        join the meeting.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {onClose && (
                        <div className="flex justify-end pt-4">
                            <Button variant="outline" onClick={onClose}>
                                Done
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
