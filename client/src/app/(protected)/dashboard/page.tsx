import { DashboardClient } from "./dashboard-client";
import { getUserGroups } from "@/actions/support-group.actions";
import { getUpcomingMeetings, getMissedMeetings } from "@/actions/meeting.actions";

// Force dynamic rendering since we use auth()
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    // Fetch all data server-side
    const [userGroupsResult, upcomingResult, missedResult] = await Promise.all([
        getUserGroups(),
        getUpcomingMeetings(),
        getMissedMeetings(),
    ]);

    const userGroups = userGroupsResult.success ? userGroupsResult.groups ?? [] : [];
    const upcomingMeetings = upcomingResult.success ? upcomingResult.meetings ?? [] : [];
    const missedMeetings = missedResult.success ? missedResult.meetings ?? [] : [];
    const canJoinMoreGroups = userGroups.length < 3;

    return (
        <DashboardClient
            userGroups={userGroups}
            upcomingMeetings={upcomingMeetings}
            missedMeetings={missedMeetings}
            canJoinMoreGroups={canJoinMoreGroups}
        />
    );
}
