// use-auth.tsx
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";

export function useAuth_({
    required = false,
    verifiedRequired = false,
    redirectTo = "/auth/login",
    redirectIfFound = false,
} = {}) {
    const { user, isLoading, isAuthenticated, isVerified, hasPermission } =
        useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        if (required && !isAuthenticated) {
            router.push(
                `${redirectTo}?callbackUrl=${encodeURIComponent(
                    window.location.href
                )}`
            );
            return;
        }
        if (required && verifiedRequired && isAuthenticated && !isVerified) {
            router.push("/auth/verify-request");
            return;
        }
        if (redirectIfFound && isAuthenticated) {
            router.push("/dashboard");
            return;
        }
    }, [
        isLoading,
        isAuthenticated,
        isVerified,
        required,
        verifiedRequired,
        redirectTo,
        redirectIfFound,
        router,
    ]);

    return {
        user,
        isLoading,
        isAuthenticated,
        isVerified,
        hasPermission,
    };
}

// useConfirmPassword is defined in @/hooks/use-confirm-password
// Do NOT duplicate it here.
