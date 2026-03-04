// use-auth.tsx
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { VERIFY_PASSWORD } from "@/graphql/operations/mutations";
import { useMutation } from "@apollo/client";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
