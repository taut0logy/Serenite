"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Call, useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

import HomeCard from "./home-card";
import MeetingModal from "./meeting-modal";
import Loader from "./loader";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";

const initialValues = {
    dateTime: new Date(),
    description: "",
    link: "",
};

const MeetingTypeList = () => {
    const router = useRouter();
    const [meetingState, setMeetingState] = useState<
        | "isScheduleMeeting"
        | "isJoiningMeeting"
        | "isInstantMeeting"
        | undefined
    >(undefined);
    const [values, setValues] = useState(initialValues);
    const [callDetail, setCallDetail] = useState<Call>();
    const client = useStreamVideoClient();
    const { user } = useAuth();

    const createMeeting = async () => {
        if (!client || !user) return;

        try {
            if (!values.dateTime) {
                toast.error("Please select a date and time");
                return;
            }

            const id = crypto.randomUUID();
            const call = client.call("default", id);

            if (!call) throw new Error("Failed to create meeting");

            const startsAt =
                values.dateTime.toISOString() ||
                new Date(Date.now()).toISOString();
            const description = values.description || "Instant Meeting";

            await call.getOrCreate({
                data: {
                    starts_at: startsAt,
                    custom: {
                        description,
                    },
                },
            });

            setCallDetail(call);

            if (!values.description) {
                router.push(`/meeting/${call.id}`);
            }

            toast.success("Meeting Created");
        } catch (error) {
            console.error(error);
            toast.error("Failed to create Meeting");
        }
    };

    if (!client || !user) return <Loader />;

    const meetingLink = `${
        process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    }/meeting/${callDetail?.id}`;

    return (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <HomeCard
                img="/icons/add-meeting.svg"
                title="New Meeting"
                description="Start an instant meeting"
                className="bg-gradient-to-br from-orange-500 to-orange-600"
                handleClick={() => setMeetingState("isInstantMeeting")}
            />
            <HomeCard
                img="/icons/join-meeting.svg"
                title="Join Meeting"
                description="via invitation link"
                className="bg-gradient-to-br from-blue-500 to-blue-600"
                handleClick={() => setMeetingState("isJoiningMeeting")}
            />
            <HomeCard
                img="/icons/schedule.svg"
                title="Schedule Meeting"
                description="Plan your meeting"
                className="bg-gradient-to-br from-purple-500 to-purple-600"
                handleClick={() => setMeetingState("isScheduleMeeting")}
            />
            <HomeCard
                img="/icons/recordings.svg"
                title="View Recordings"
                description="Meeting Recordings"
                className="bg-gradient-to-br from-yellow-500 to-yellow-600"
                handleClick={() => router.push("/recordings")}
            />

            {!callDetail ? (
                <MeetingModal
                    isOpen={meetingState === "isScheduleMeeting"}
                    onClose={() => setMeetingState(undefined)}
                    title="Create Meeting"
                    handleClick={createMeeting}
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Add a description
                            </Label>
                            <Textarea
                                className="resize-none"
                                placeholder="What's this meeting about?"
                                onChange={(e) =>
                                    setValues({
                                        ...values,
                                        description: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Select Date and Time
                            </Label>
                            <DateTimePicker
                                value={values.dateTime}
                                onChange={(date) =>
                                    setValues({
                                        ...values,
                                        dateTime: date || new Date(),
                                    })
                                }
                            />
                        </div>
                    </div>
                </MeetingModal>
            ) : (
                <MeetingModal
                    isOpen={meetingState === "isScheduleMeeting"}
                    onClose={() => setMeetingState(undefined)}
                    title="Meeting Created"
                    handleClick={() => {
                        navigator.clipboard.writeText(meetingLink);
                        toast.success("Link Copied");
                    }}
                    image="/icons/checked.svg"
                    buttonIcon="/icons/copy.svg"
                    className="text-center"
                    buttonText="Copy Meeting Link"
                />
            )}

            <MeetingModal
                isOpen={meetingState === "isJoiningMeeting"}
                onClose={() => setMeetingState(undefined)}
                title="Join Meeting"
                className="text-center"
                buttonText="Join Meeting"
                handleClick={() => router.push(values.link)}
            >
                <Input
                    placeholder="Meeting link"
                    onChange={(e) =>
                        setValues({ ...values, link: e.target.value })
                    }
                    className="w-full"
                />
            </MeetingModal>

            <MeetingModal
                isOpen={meetingState === "isInstantMeeting"}
                onClose={() => setMeetingState(undefined)}
                title="Start an Instant Meeting"
                className="text-center"
                buttonText="Start Meeting"
                handleClick={createMeeting}
            />
        </section>
    );
};

export default MeetingTypeList;
