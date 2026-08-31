import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SessionState } from "@/lib/assessment/session";

/**
 * These cover the one claim the consent screen makes that the code has to keep:
 * that a contributed sitting cannot be traced back to the person who gave it.
 *
 * Everything else about this feature is a preference toggle. This part is a
 * promise, and it is only true for as long as nothing writes an account
 * identifier next to the answers.
 */

const authMock = vi.fn();
const findUnique = vi.fn();
const createMany = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/prisma", () => ({
    default: {
        user: { findUnique: (...args: unknown[]) => findUnique(...args) },
        calibrationResponse: { createMany: (...args: unknown[]) => createMany(...args) },
    },
}));

const { contributeCalibrationResponses } = await import("@/actions/calibration.actions");

const USER_ID = "user_abc123";

function session(): SessionState {
    return {
        responses: {
            depression: [
                { itemId: "dep_a1", a: 1.5, b: [-1, 0, 1], value: 2, responseTimeMs: 3100 },
                { itemId: "dep_o3", a: 1.2, b: [-1, 0, 1], value: 1, responseTimeMs: 2400 },
            ],
            sleep: [{ itemId: "sl_o2", a: 1.9, b: [-1, 0, 1], value: 3, responseTimeMs: 1800 }],
        },
        traumaGateAnswered: false,
        traumaExposed: false,
        priorities: null,
        history: [],
        riskDetected: false,
        startedAt: Date.now(),
    } as unknown as SessionState;
}

const contribute = (qualityFlagged = false) =>
    contributeCalibrationResponses({
        session: session(),
        parameterSetId: "ps-2026-01-provisional-1",
        qualityFlagged,
    });

beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: USER_ID } });
    findUnique.mockResolvedValue({ calibrationConsent: true });
    createMany.mockResolvedValue({ count: 3 });
});

describe("contributing calibration responses", () => {
    it("writes nothing that identifies the member", async () => {
        await contribute();

        const written = JSON.stringify(createMany.mock.calls[0][0]);
        expect(written).not.toContain(USER_ID);
        for (const row of createMany.mock.calls[0][0].data) {
            expect(row).not.toHaveProperty("userId");
        }
    });

    it("uses a different key for every sitting, so two are not linkable", async () => {
        await contribute();
        await contribute();

        const first = createMany.mock.calls[0][0].data[0].respondentKey;
        const second = createMany.mock.calls[1][0].data[0].respondentKey;
        expect(first).not.toBe(second);
    });

    it("files one sitting under a single key, so its answers stay together", async () => {
        await contribute();

        const keys = new Set(
            createMany.mock.calls[0][0].data.map((r: { respondentKey: string }) => r.respondentKey)
        );
        expect(keys.size).toBe(1);
    });

    it("records administration order, which fatigue effects need", async () => {
        await contribute();

        const positions = createMany.mock.calls[0][0].data.map(
            (r: { position: number }) => r.position
        );
        expect(positions).toEqual([0, 1, 2]);
    });

    it("stamps the parameter set the answers were collected under", async () => {
        await contribute();

        for (const row of createMany.mock.calls[0][0].data) {
            expect(row.parameterSetId).toBe("ps-2026-01-provisional-1");
        }
    });
});

describe("when it must not contribute", () => {
    it("does nothing without consent, which is the default", async () => {
        findUnique.mockResolvedValue({ calibrationConsent: false });

        const result = await contribute();

        expect(createMany).not.toHaveBeenCalled();
        expect(result.contributed).toBe(0);
    });

    it("skips a sitting flagged for careless responding", async () => {
        // Straight-lined answers would drag item parameters toward whatever a
        // flat response pattern implies, which is the opposite of the point.
        const result = await contribute(true);

        expect(createMany).not.toHaveBeenCalled();
        expect(result.contributed).toBe(0);
    });

    it("checks consent before it checks anything else about the answers", async () => {
        findUnique.mockResolvedValue({ calibrationConsent: false });

        await contribute();

        expect(createMany).not.toHaveBeenCalled();
    });

    it("does nothing when nobody is signed in", async () => {
        authMock.mockResolvedValue(null);

        const result = await contribute();

        expect(createMany).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
    });
});

describe("failure handling", () => {
    /**
     * Contributing runs after the member's own results are saved. A failure
     * here is the project's problem, not theirs, and must not reach them as
     * though their assessment had gone wrong.
     */
    it("reports failure without throwing when the write fails", async () => {
        createMany.mockRejectedValue(new Error("connection reset"));

        await expect(contribute()).resolves.toEqual({ success: false, contributed: 0 });
    });

    it("does not throw when the consent lookup fails", async () => {
        findUnique.mockRejectedValue(new Error("connection reset"));

        await expect(contribute()).resolves.toEqual({ success: false, contributed: 0 });
    });
});
