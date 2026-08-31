"use server";

import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { SessionState } from "@/lib/assessment/session";
import { DOMAIN_ORDER } from "@/lib/assessment/session";

/**
 * Contributing anonymised answers, so the item bank can eventually be
 * calibrated on real data instead of shipping provisional parameters forever.
 *
 * The privacy property this rests on: a contributed response carries a
 * `respondentKey` generated fresh for that sitting and stored nowhere against
 * the account. The only thing recorded about a member is the consent flag
 * itself. Knowing someone consented does not let you find their answers, and
 * finding a set of answers does not let you name who wrote them.
 *
 * Consent is separate from account creation and from the assessment, default
 * off, and revocable.
 */

export async function getCalibrationConsent(): Promise<{
    success: boolean;
    consented?: boolean;
    error?: string;
}> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "User not authenticated" };

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { calibrationConsent: true },
        });
        return { success: true, consented: user?.calibrationConsent ?? false };
    } catch (error) {
        console.error("Error reading calibration consent:", error);
        return { success: false, error: "Could not read your preference" };
    }
}

/**
 * Records or withdraws consent.
 *
 * Withdrawing stops future contributions but cannot retract past ones: they
 * carry no link back to the account, so there is nothing to look up and
 * delete. The interface has to say that plainly before anyone opts in, rather
 * than implying a reversibility that anonymity has already ruled out.
 */
export async function setCalibrationConsent(
    consented: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "User not authenticated" };

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                calibrationConsent: consented,
                calibrationConsentAt: consented ? new Date() : null,
            },
        });
        return { success: true };
    } catch (error) {
        console.error("Error saving calibration consent:", error);
        return { success: false, error: "Could not save your preference" };
    }
}

/**
 * Contributes one completed sitting, if the member has opted in.
 *
 * Called after the assessment is saved, never before: a failure here must not
 * cost somebody their own results. Returns quietly in every declining case,
 * because none of them is an error the member should see.
 *
 * A sitting flagged for careless responding is skipped. Straight-lined answers
 * would bias item parameters toward whatever the flat response pattern implies,
 * which is the opposite of what calibration is for.
 */
export async function contributeCalibrationResponses(input: {
    session: SessionState;
    parameterSetId: string;
    qualityFlagged: boolean;
}): Promise<{ success: boolean; contributed: number }> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, contributed: 0 };
        if (input.qualityFlagged) return { success: true, contributed: 0 };

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { calibrationConsent: true },
        });
        if (!user?.calibrationConsent) return { success: true, contributed: 0 };

        // Fresh per sitting, from a CSPRNG, and never written next to the
        // account. Two sittings by the same person are not linkable, which
        // costs a little statistical power and buys the anonymity the consent
        // language promises.
        const respondentKey = randomUUID();

        // Administration order matters to calibration: position captures
        // practice and fatigue effects that a bare response cannot.
        let position = 0;
        const rows = DOMAIN_ORDER.flatMap((domain) =>
            (input.session.responses[domain] ?? []).map((response) => ({
                respondentKey,
                itemId: response.itemId,
                value: response.value,
                position: position++,
                responseTimeMs: response.responseTimeMs ?? null,
                parameterSetId: input.parameterSetId,
            }))
        );

        if (rows.length === 0) return { success: true, contributed: 0 };

        await prisma.calibrationResponse.createMany({ data: rows });
        return { success: true, contributed: rows.length };
    } catch (error) {
        // Swallowed on purpose. Contributing is a favour the member is doing
        // the project; it must never surface as a failure of their own
        // assessment, which has already been saved by this point.
        console.error("Error contributing calibration responses:", error);
        return { success: false, contributed: 0 };
    }
}
