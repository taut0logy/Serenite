import { encode, decode } from "next-auth/jwt";

// Short-lived override for a claim in the session JWT, set right after a
// server action changes it, so the next request isn't stuck on a stale flag.

export type ClaimName = "questionnaireCompleted" | "hasPassword" | "email_verified" | "kycVerified";

export interface ClaimOverridePayload {
    userId: string;
    claims: Partial<Record<ClaimName, boolean>>;
}

export const CLAIM_OVERRIDE_COOKIE = "serenite.claim-overrides";
const SALT = "serenite.claim-overrides";
const DEFAULT_TTL_SECONDS = 60;

export async function encodeClaimOverride(
    userId: string,
    claims: Partial<Record<ClaimName, boolean>>,
    secret: string,
    ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<string> {
    return encode({
        token: { userId, claims },
        secret,
        salt: SALT,
        maxAge: ttlSeconds,
    });
}

export async function decodeClaimOverride(
    token: string,
    secret: string
): Promise<ClaimOverridePayload | null> {
    try {
        const payload = await decode({ token, secret, salt: SALT });
        if (!payload || typeof payload.userId !== "string" || typeof payload.claims !== "object") {
            return null;
        }
        return { userId: payload.userId, claims: payload.claims as Partial<Record<ClaimName, boolean>> };
    } catch {
        return null;
    }
}

// Override wins only when it's for the current user and carries this claim;
// otherwise falls back to whatever the (possibly stale) JWT already has.
export function resolveClaim(
    claim: ClaimName,
    jwtValue: boolean,
    override: ClaimOverridePayload | null,
    userId: string
): boolean {
    if (override && override.userId === userId && claim in override.claims) {
        return override.claims[claim]!;
    }
    return jwtValue;
}
