import { cookies } from "next/headers";
import { auth } from "@/auth";
import { encodeClaimOverride, CLAIM_OVERRIDE_COOKIE, type ClaimName } from "@/lib/claim-overrides";

// Call right after a server action changes a gating claim in the DB.
export async function setClaimOverride(claims: Partial<Record<ClaimName, boolean>>): Promise<void> {
    const session = await auth();
    if (!session?.user?.id) return;

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        console.error("AUTH_SECRET missing, cannot set claim override");
        return;
    }

    const token = await encodeClaimOverride(session.user.id, claims, secret);
    const cookieStore = await cookies();
    cookieStore.set(CLAIM_OVERRIDE_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60,
    });
}
