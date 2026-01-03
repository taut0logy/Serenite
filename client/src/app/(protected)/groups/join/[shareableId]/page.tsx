import { getGroupByShareableId, getUserGroups } from "@/actions/support-group.actions";
import { JoinConfirmationClient } from "./join-confirmation-client";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ shareableId: string }>;
}

export default async function JoinGroupPage({ params }: PageProps) {
    const { shareableId } = await params;

    // Fetch group and user's current groups in parallel
    const [groupResult, userGroupsResult] = await Promise.all([
        getGroupByShareableId(shareableId),
        getUserGroups(),
    ]);

    if (!groupResult.success || !groupResult.group) {
        redirect("/dashboard?error=group-not-found");
    }

    const userGroups = userGroupsResult.success ? userGroupsResult.groups ?? [] : [];
    const isAlreadyMember = groupResult.group.isMember;
    const hasReachedMax = userGroups.length >= 3;
    const isFull = groupResult.group.vacancy <= 0;

    return (
        <JoinConfirmationClient
            group={groupResult.group}
            isAlreadyMember={isAlreadyMember}
            hasReachedMax={hasReachedMax}
            isFull={isFull}
        />
    );
}
