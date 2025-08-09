"use client";

import EnhancedMeetingRoom from "./enhanced-meeting-room";

const MeetingRoom = ({ id }: { id?: string }) => {
    // Use the enhanced meeting room with encryption support
    return <EnhancedMeetingRoom id={id} enableEncryption={true} />;
};

export default MeetingRoom;
