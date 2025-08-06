"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { StreamCall, StreamTheme } from "@stream-io/video-react-sdk";
import MeetingSetup from "@/components/meeting/meeting-setup";
import MeetingRoom from "@/components/meeting/meeting-room";
import { useGetCallById } from "@/hooks/useGetCallById";
import Loader from "@/components/meeting/loader";
import { Suspense } from "react";
import { useParams } from "next/navigation";

export default function MeetingPage() {
    const params = useParams();
    const id = params?.id as string;

    return (
        <Suspense fallback={<Loader />}>
            <MeetingPageContent id={id as string} />
        </Suspense>
    );
}

const MeetingPageContent = ({ id }: { id: string }) => {
    const { isLoading, user } = useAuth({ required: true });
    const { call, isCallLoading } = useGetCallById(id);
    const [isSetupComplete, setIsSetupComplete] = useState(false);

    if (isLoading || isCallLoading) return <Loader />;

    if (!user) {
        return (
            <div className="flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="text-center space-y-4">
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Please sign in to join the meeting
                    </p>
                </div>
            </div>
        );
    }

    if (!call)
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="text-center space-y-4">
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Meeting not found
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                        Please check your meeting link and try again
                    </p>
                </div>
            </div>
        );

    return (
        <main className="w-full overflow-hidden">
            <StreamCall call={call}>
                <StreamTheme className="h-full">
                    {!isSetupComplete ? (
                        <MeetingSetup setIsSetupComplete={setIsSetupComplete} />
                    ) : (
                        <MeetingRoom />
                    )}
                </StreamTheme>
            </StreamCall>
        </main>
    );
};
