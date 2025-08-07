"use client";

import { useCall } from "@stream-io/video-react-sdk";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PhoneOff } from "lucide-react";

const EndCallButton = () => {
    const call = useCall();
    const router = useRouter();

    if (!call) {
        throw new Error(
            "useStreamCall must be used within a StreamCall component."
        );
    }

    const endCall = async () => {
        await call.endCall();
        router.push("/dashboard");
    };

    return (
        <Button
            onClick={endCall}
            className="bg-red-600 hover:bg-red-700 text-white border border-red-500 rounded-lg px-3 py-2 transition-all duration-200 hover:shadow-lg"
            size="sm"
        >
            <PhoneOff size={18} />
            <span className="ml-2 hidden sm:inline">End Call</span>
        </Button>
    );
};

export default EndCallButton;
