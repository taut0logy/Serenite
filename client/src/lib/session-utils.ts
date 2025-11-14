import { useSession } from "next-auth/react";

export function useRefreshSession() {
    const { update } = useSession();

    const refreshSession = async () => {
        try {
            console.log("Refreshing session...");
            await update({ forceRefresh: true });
            console.log("Session refreshed successfully");
        } catch (error) {
            console.error("Failed to refresh session:", error);
        }
    };

    return { refreshSession };
}
