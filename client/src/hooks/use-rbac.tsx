"use client";

import { useAuthContext } from "@/providers/auth-provider";
import { toast } from "sonner";
import { useEffect } from "react";

/**
 * Hook for role-based access control
 *
 * @param requiredRole The minimum role required to access a feature
 * @returns Object with permission check results
 */
export function useRBAC(requiredRole?: string) {
    const { isLoading, hasPermission } = useAuthContext();

    // Check if user has required role
    const canAccess = hasPermission(requiredRole);

    useEffect(() => {
        if (!isLoading && !canAccess) {
            toast.error(
                "Sorry, You don't have permission to access this page."
            );
        }
    }, [canAccess, isLoading]);

    return {
        isLoading,
        canAccess,
        hasPermission,
    };
}

/**
 * A higher-order hook that checks if a function should be allowed to execute
 * based on the user's role
 *
 * @param fn The function to protect
 * @param requiredRole The minimum required role
 * @returns A wrapped function that only executes if the user has permission
 */
export function withPermission<T extends (...args: any[]) => any>(
    fn: T,
    requiredRole?: string
): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return (...args: Parameters<T>): ReturnType<T> | undefined => {
        const { canAccess } = useRBAC(requiredRole);

        if (canAccess) {
            return fn(...args);
        }

        console.warn(
            `Permission denied: Required role '${
                requiredRole || "authenticated"
            }' not met`
        );
        return undefined;
    };
}

export default useRBAC;
