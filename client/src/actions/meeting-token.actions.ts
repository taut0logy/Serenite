"use server";

import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
    JOIN_REFUSAL_MESSAGE,
    checkJoinAccess,
    type JoinRefusal,
} from "@/lib/meeting/access";
import { requiresFacilitator } from "@/lib/assessment/eligibility";
import type { SeverityLevel } from "@/lib/assessment/scoring";

/**
 * Mints the capability that admits a member to a live session.
 *
 * This is the enforcement point for the whole meeting path. The meet service
 * verifies the token's signature, expiry and single use, and admits its holder
 * without asking anything further, because only this app knows about group
 * membership, severity bands and risk status. Every rule therefore has to be
 * satisfied here, before a token exists.
 */

const TOKEN_TTL_SECONDS = 120;

/**
 * A MeetingSession with no heartbeat for this long is treated as gone. Without
 * it a browser killed mid-call would block the member's next join forever.
 * Matches the cutoff in api/meetings/[meetingId]/join.
 */
const SESSION_STALE_MS = 5 * 60 * 1000;

function secret(): Uint8Array {
    const value = process.env.JOIN_TOKEN_SECRET;
    if (!value) {
        // Refusing to start is the right failure. A missing secret would
        // otherwise mint tokens the meet service silently rejects, which looks
        // like a media fault rather than a configuration one.
        throw new Error("JOIN_TOKEN_SECRET is not set");
    }
    return new TextEncoder().encode(value);
}

export interface JoinGrant {
    token: string;
    sfuUrl: string;
    meetingId: string;
    /** Facilitators are admitted as HOST and can let others in. */
    role: "HOST" | "PARTICIPANT";
}

export async function requestJoinToken(meetingId: string): Promise<
    | { success: true; grant: JoinGrant }
    | { success: false; error: string; reason?: JoinRefusal }
> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "User not authenticated" };
        const userId = session.user.id;

        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                supportGroup: {
                    select: {
                        id: true,
                        maxSeverity: true,
                        facilitatorId: true,
                        members: { where: { id: userId }, select: { id: true } },
                    },
                },
            },
        });

        if (!meeting?.supportGroup) {
            // Same shape as a non-member refusal on purpose: a stranger should
            // not be able to tell a missing meeting from one they cannot enter.
            return {
                success: false,
                error: JOIN_REFUSAL_MESSAGE.NOT_MEMBER,
                reason: "NOT_MEMBER",
            };
        }

        const staleBefore = new Date(Date.now() - SESSION_STALE_MS);

        const [assessment, activeElsewhere, profile, dbSession] = await Promise.all([
            prisma.assessment.findFirst({
                where: { userId, isComplete: true },
                orderBy: { completedAt: "desc" },
                select: { riskEscalated: true },
            }),
            // Overlap control. Bounded by the heartbeat so a browser killed
            // mid-call cannot lock the member out of every future session; the
            // meet service also closes orphaned rows at boot.
            prisma.meetingSession.findFirst({
                where: {
                    userId,
                    isActive: true,
                    meetingId: { not: meetingId },
                    lastHeartbeat: { gt: staleBefore },
                },
                select: { id: true },
            }),
            prisma.profile.findUnique({
                where: { userId },
                select: { firstName: true, avatarUrl: true },
            }),
            // The device this join belongs to. Attendance is keyed on it, so
            // the same account in two browsers is two rows rather than a
            // constraint violation. Same resolution the existing join route
            // uses: most recent unexpired session, which is approximate when
            // several devices are signed in at once.
            prisma.session.findFirst({
                where: { userId, expiresAt: { gt: new Date() } },
                orderBy: { createdAt: "desc" },
                select: { id: true },
            }),
        ]);

        if (!dbSession) {
            return { success: false, error: "Your sign-in has expired. Please sign in again." };
        }

        const endTime =
            meeting.endTime ?? new Date(meeting.startTime.getTime() + 60 * 60 * 1000);

        const refusal = checkJoinAccess({
            isMember: meeting.supportGroup.members.length > 0,
            riskEscalated: assessment?.riskEscalated ?? false,
            activeElsewhere: activeElsewhere !== null,
            groupNeedsFacilitator: requiresFacilitator({
                maxSeverity: meeting.supportGroup.maxSeverity as SeverityLevel,
            }),
            hasFacilitator: meeting.supportGroup.facilitatorId !== null,
            status: meeting.status as "PENDING" | "RUNNING" | "ENDED",
            startTime: meeting.startTime,
            endTime,
            now: new Date(),
        });

        if (refusal) {
            return { success: false, error: JOIN_REFUSAL_MESSAGE[refusal], reason: refusal };
        }

        const isFacilitator = meeting.supportGroup.facilitatorId === userId;
        const role: JoinGrant["role"] = isFacilitator ? "HOST" : "PARTICIPANT";

        // Everyone waits to be admitted except the facilitator running the
        // session. For a support group the waiting room is a safety mechanism,
        // not a formality: it is the facilitator's one chance to notice
        // somebody arriving in a bad state before they are on camera in front
        // of the group.
        const token = await new SignJWT({
            typ: "join",
            mid: meetingId,
            name: profile?.firstName ?? "Member",
            avatar: profile?.avatarUrl ?? null,
            role,
            approve: !isFacilitator,
            sid: dbSession.id,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setSubject(userId)
            .setJti(randomUUID())
            .setIssuedAt()
            .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
            .sign(secret());

        return {
            success: true,
            grant: {
                token,
                sfuUrl: process.env.NEXT_PUBLIC_SFU_URL ?? "http://localhost:4100",
                meetingId,
                role,
            },
        };
    } catch (error) {
        console.error("Error minting join token:", error);
        return { success: false, error: "Could not join the session" };
    }
}
