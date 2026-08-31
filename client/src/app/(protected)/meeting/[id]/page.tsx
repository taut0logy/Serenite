"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LiveRoom } from "@/components/meeting-room/live-room";
import { requestJoinToken } from "@/actions/meeting-token.actions";
import { canJoinMeeting, type JoinCheckResult } from "@/actions/meeting.actions";

/**
 * Gate, then lobby, then the live call.
 *
 * The join token is minted here and written to sessionStorage before the room
 * mounts, because the connection hook reads it from there on connect and on
 * every reload afterwards. Nothing about admission is decided in the browser;
 * this only carries the answer the server already gave.
 */

type Phase = "checking" | "blocked" | "lobby" | "joining" | "live";

function joinStorageKey(meetingId: string) {
    return `meet:join:${meetingId}`;
}

function Centered({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
            <Card className="w-full max-w-md">
                <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                    {children}
                </CardContent>
            </Card>
        </div>
    );
}

export default function MeetingPage() {
    const params = useParams();
    const router = useRouter();
    const meetingId = params?.id as string;

    const [phase, setPhase] = useState<Phase>("checking");
    const [check, setCheck] = useState<JoinCheckResult | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const result = await canJoinMeeting(meetingId);
            if (cancelled) return;

            if (!result.success || !result.result) {
                setMessage(result.error ?? "This session could not be opened.");
                setPhase("blocked");
                return;
            }

            setCheck(result.result);
            setPhase(result.result.canJoin ? "lobby" : "blocked");
        })();
        return () => {
            cancelled = true;
        };
    }, [meetingId]);

    const join = useCallback(async () => {
        setPhase("joining");
        setMessage(null);

        // The mint is the real gate. canJoinMeeting above only decides what to
        // show; this decides whether anyone gets in, and re-checks membership,
        // risk status, the facilitator requirement and overlap at this moment
        // rather than when the page loaded.
        const result = await requestJoinToken(meetingId);
        if (!result.success) {
            setMessage(result.error);
            setPhase("blocked");
            return;
        }

        sessionStorage.setItem(
            joinStorageKey(meetingId),
            JSON.stringify({ token: result.grant.token, wsUrl: result.grant.sfuUrl })
        );
        setPhase("live");
    }, [meetingId]);

    if (phase === "checking") {
        return (
            <Centered>
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Checking the session…</p>
            </Centered>
        );
    }

    if (phase === "blocked") {
        return (
            <Centered>
                <p className="text-sm text-foreground">
                    {message ?? reasonMessage(check)}
                </p>
                <Button variant="outline" onClick={() => router.push("/dashboard")}>
                    Back to dashboard
                </Button>
            </Centered>
        );
    }

    if (phase === "lobby" || phase === "joining") {
        return (
            <Centered>
                <div>
                    <h1 className="text-lg font-semibold">
                        {check?.meeting?.groupName ?? "Support session"}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {check?.waitingRoom
                            ? "The session has not started yet. You will wait until the facilitator lets you in."
                            : "Your facilitator will admit you once you join."}
                    </p>
                </div>
                <Button onClick={join} disabled={phase === "joining"} className="w-full">
                    {phase === "joining" ? (
                        <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Joining…
                        </>
                    ) : (
                        "Join session"
                    )}
                </Button>
            </Centered>
        );
    }

    return <LiveRoom meetingId={meetingId} onLeave={() => router.push("/dashboard")} />;
}

function reasonMessage(check: JoinCheckResult | null): string {
    switch (check?.reason) {
        case "not_member":
            return "This session is for members of that group.";
        case "meeting_ended":
            return "This session has ended.";
        case "too_early":
            return "This session has not opened yet.";
        case "too_late":
            return "This session is over.";
        default:
            return "This session cannot be opened right now.";
    }
}
