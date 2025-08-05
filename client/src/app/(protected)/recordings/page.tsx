"use client";

import { useEffect, useState } from "react";
import { useStreamVideoClient, Call } from "@stream-io/video-react-sdk";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Calendar, Clock } from "lucide-react";
import Loader from "@/components/meeting/loader";

// Extended type to include recording data
interface CallWithRecording extends Call {
    custom?: {
        description?: string;
    };
    created_at?: string;
    recording?: Array<{
        url: string;
        filename: string;
    }>;
}

const RecordingsPage = () => {
    const { user } = useAuth();
    const client = useStreamVideoClient();
    const [recordings, setRecordings] = useState<CallWithRecording[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRecordings = async () => {
            if (!client || !user?.id) return;

            try {
                // Fetch recordings for the user
                const { calls } = await client.queryCalls({
                    filter_conditions: {
                        created_by_user_id: user.id,
                    },
                    sort: [{ field: "created_at", direction: -1 }],
                    limit: 20,
                });

                // Filter calls that have recordings (simplified for now)
                const callsWithRecordings = calls.filter(() => {
                    // For now, assume all calls have potential recordings
                    // In practice, you'd check if the call has actual recording data
                    return true;
                });

                setRecordings(callsWithRecordings as CallWithRecording[]);
            } catch (error) {
                console.error("Error fetching recordings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecordings();
    }, [client, user?.id]);

    if (isLoading) return <Loader />;

    return (
        <div className="container mx-auto py-6 px-4">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Recordings
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        View and manage your meeting recordings
                    </p>
                </div>

                {/* Recordings List */}
                {recordings.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-semibold">
                                    No recordings found
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Your meeting recordings will appear here
                                    once you start recording meetings.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {recordings.map((call) => (
                            <Card
                                key={call.id}
                                className="hover:shadow-md transition-shadow"
                            >
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">
                                            {call.custom?.description ||
                                                "Meeting Recording"}
                                        </CardTitle>
                                        <Badge variant="secondary">
                                            {call.recording?.length || 0}{" "}
                                            recording
                                            {call.recording?.length !== 1
                                                ? "s"
                                                : ""}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                {call.created_at
                                                    ? new Date(
                                                          call.created_at
                                                      ).toLocaleDateString()
                                                    : "Unknown date"}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {call.created_at
                                                    ? new Date(
                                                          call.created_at
                                                      ).toLocaleTimeString()
                                                    : "Unknown time"}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    // Open recording in new tab
                                                    if (
                                                        call.recording?.[0]?.url
                                                    ) {
                                                        window.open(
                                                            call.recording[0]
                                                                .url,
                                                            "_blank"
                                                        );
                                                    }
                                                }}
                                            >
                                                <Play className="h-4 w-4 mr-1" />
                                                Play
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    // Download recording
                                                    if (
                                                        call.recording?.[0]?.url
                                                    ) {
                                                        const link =
                                                            document.createElement(
                                                                "a"
                                                            );
                                                        link.href =
                                                            call.recording[0].url;
                                                        link.download = `recording-${call.id}.mp4`;
                                                        link.click();
                                                    }
                                                }}
                                            >
                                                <Download className="h-4 w-4 mr-1" />
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecordingsPage;
