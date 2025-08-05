export interface MeetingParticipant {
    id: string;
    userId: string;
    meetingId: string;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REMOVED';
    user: {
      id: string;
      email: string;
      profile: {
        firstName: string | null;
        lastName: string | null;
      } | null;
    };
  }
  
  export interface Meeting {
    id: string;
    title: string;
    description: string;
    startTime: string;
    endTime?: string;
    status: 'PENDING' | 'RUNNING' | 'ENDED' | 'CANCELLED';
    hostId: string;
    host: {
      id: string;
      email: string;
      profile: {
        firstName: string | null;
        lastName: string | null;
      } | null;
    };
    participants: MeetingParticipant[];
  }