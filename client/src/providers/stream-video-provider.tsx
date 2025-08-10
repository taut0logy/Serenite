"use client";

import { ReactNode, useEffect, useState } from "react";
import { StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { tokenProvider } from "@/actions/stream.actions";

const StreamVideoProvider = ({ children }: { children: ReactNode }) => {
    const [videoClient, setVideoClient] = useState<StreamVideoClient>();
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (!user || isLoading) return;

        if (!process.env.NEXT_PUBLIC_STREAM_API_KEY) {
            throw new Error("Stream API key is missing");
        }

        const client = StreamVideoClient.getOrCreateInstance({
            apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!,
            user: {
                id: user.id,
                name: user.firstName
                    ? `${user.firstName} ${user.lastName || ""}`.trim()
                    : user.email,
                image:
                    user.image ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user.firstName || user.email
                    )}&background=0088cc&color=fff`,
            },
            tokenProvider,
        });

        setVideoClient(client);
    }, [user, isLoading]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center bg-background min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!videoClient) return null;

    return <StreamVideo client={videoClient}>{children}</StreamVideo>;
};

export default StreamVideoProvider;
