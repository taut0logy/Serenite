"use client";

import EnhancedMeetingRoom from "./enhanced-meeting-room";

/**
 * Meeting room component with encryption enabled by default
 * Use this for sensitive meetings or support groups that require E2E encryption
 */
const MeetingRoomWithEncryption = ({ id }: { id?: string }) => {
    return <EnhancedMeetingRoom id={id} enableEncryption={true} />;
};

export default MeetingRoomWithEncryption;
