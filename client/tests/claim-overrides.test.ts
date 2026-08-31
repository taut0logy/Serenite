import { describe, it, expect } from "vitest";
import { resolveClaim, encodeClaimOverride, decodeClaimOverride } from "@/lib/claim-overrides";

describe("resolveClaim", () => {
    const override = { userId: "user-1", claims: { questionnaireCompleted: true } };

    it("prefers the override when it matches the current user and claim", () => {
        expect(resolveClaim("questionnaireCompleted", false, override, "user-1")).toBe(true);
    });

    it("falls back to the JWT value when the override is for a different user", () => {
        expect(resolveClaim("questionnaireCompleted", false, override, "user-2")).toBe(false);
    });

    it("falls back to the JWT value when the claim isn't in the override", () => {
        expect(resolveClaim("hasPassword", true, override, "user-1")).toBe(true);
    });

    it("falls back to the JWT value when there is no override", () => {
        expect(resolveClaim("questionnaireCompleted", false, null, "user-1")).toBe(false);
    });
});

describe("encodeClaimOverride / decodeClaimOverride", () => {
    const secret = "test-secret-value-not-used-in-production";

    it("round-trips a claims payload", async () => {
        const token = await encodeClaimOverride("user-1", { questionnaireCompleted: true }, secret);
        const decoded = await decodeClaimOverride(token, secret);
        expect(decoded).toEqual({ userId: "user-1", claims: { questionnaireCompleted: true } });
    });

    it("rejects a token signed with a different secret", async () => {
        const token = await encodeClaimOverride("user-1", { hasPassword: true }, secret);
        const decoded = await decodeClaimOverride(token, "a-completely-different-secret-value");
        expect(decoded).toBeNull();
    });

    it("rejects garbage input", async () => {
        expect(await decodeClaimOverride("not-a-real-token", secret)).toBeNull();
    });

    it("rejects an expired token", async () => {
        // next-auth's decode allows a 15s clock tolerance, so go well past it.
        const token = await encodeClaimOverride("user-1", { questionnaireCompleted: true }, secret, -120);
        expect(await decodeClaimOverride(token, secret)).toBeNull();
    });
});
