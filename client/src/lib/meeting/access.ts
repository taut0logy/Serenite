// Who may enter a live session, as pure functions.
//
// The token mint is the enforcement point: a join token is a capability, and
// once one is issued the meet service admits its holder without asking
// anything further. `canJoinMeeting` calls the same rules so the interface
// does not offer a button that the mint will refuse.

export type JoinRefusal =
    | "NOT_MEMBER"
    | "RISK_ESCALATED"
    | "ALREADY_IN_MEETING"
    | "FACILITATOR_REQUIRED"
    | "MEETING_ENDED"
    | "TOO_EARLY"
    | "TOO_LATE";

export interface JoinFacts {
    isMember: boolean;
    /** Latest completed assessment escalated on risk. */
    riskEscalated: boolean;
    /** The member already holds a live session in some other meeting. */
    activeElsewhere: boolean;
    /** The owning group's severity range reaches MODERATE or SEVERE. */
    groupNeedsFacilitator: boolean;
    hasFacilitator: boolean;
    status: "PENDING" | "RUNNING" | "ENDED";
    startTime: Date;
    endTime: Date;
    now: Date;
}

/** How long before the scheduled start a member may arrive. */
export const EARLY_JOIN_MS = 10 * 60 * 1000;

/**
 * The first rule refusing this member, or null.
 *
 * Order matters. Risk is checked before anything about the meeting, so a
 * member being held back for one-to-one support is told that, rather than
 * being told they are early. Membership comes first only because it is the
 * one refusal that should not leak whether a meeting exists.
 */
export function checkJoinAccess(facts: JoinFacts): JoinRefusal | null {
    if (!facts.isMember) return "NOT_MEMBER";
    if (facts.riskEscalated) return "RISK_ESCALATED";

    // A session in a group whose range reaches MODERATE or SEVERE does not
    // start without the facilitator assigned to it. This is the same
    // invariant that blocks joining such a group, applied at the moment it
    // would actually go live.
    if (facts.groupNeedsFacilitator && !facts.hasFacilitator) return "FACILITATOR_REQUIRED";

    if (facts.status === "ENDED") return "MEETING_ENDED";
    if (facts.now.getTime() > facts.endTime.getTime()) return "TOO_LATE";
    if (facts.now.getTime() < facts.startTime.getTime() - EARLY_JOIN_MS) return "TOO_EARLY";

    // Checked last because it is the most transient: being in another call is
    // something the member can resolve in seconds, unlike the rest.
    if (facts.activeElsewhere) return "ALREADY_IN_MEETING";

    return null;
}

export const JOIN_REFUSAL_MESSAGE: Record<JoinRefusal, string> = {
    NOT_MEMBER: "This session is for members of that group.",
    RISK_ESCALATED:
        "Group sessions are paused for you right now. Your one-to-one conversation is open instead.",
    ALREADY_IN_MEETING: "You're already in another session. Leave that one first.",
    FACILITATOR_REQUIRED: "This session can't start until a facilitator is assigned to the group.",
    MEETING_ENDED: "This session has ended.",
    TOO_EARLY: "This session hasn't opened yet.",
    TOO_LATE: "This session is over.",
};
