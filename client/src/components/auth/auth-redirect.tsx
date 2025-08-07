import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/providers/auth-provider";

interface AuthRedirectProps {
    /**
     * Where to redirect if the user is authenticated
     */
    whenAuthenticated?: string;

    /**
     * Where to redirect if the user is not authenticated
     */
    whenUnauthenticated?: string;

    /**
     * Where to redirect if the user is not verified
     */
    whenUnverified?: string;

    /**
     * The minimum role required, will redirect if not met
     */
    requiredRole?: string;

    /**
     * Where to redirect if the required role is not met
     */
    whenRoleMismatch?: string;
}

/**
 * Component for handling auth-related redirects
 * Can be placed in layouts or pages to manage access control
 */
const AuthRedirect: React.FC<AuthRedirectProps> = ({
    whenAuthenticated,
    whenUnauthenticated,
    whenUnverified,
    requiredRole,
    whenRoleMismatch = "/dashboard",
}) => {
    const { isAuthenticated, isVerified, hasPermission } = useAuthContext();
    const router = useRouter();

    useEffect(() => {
        // Handle authenticated user redirects
        if (isAuthenticated && whenAuthenticated) {
            router.push(whenAuthenticated);
            return;
        }

        // Handle unauthenticated user redirects
        if (!isAuthenticated && whenUnauthenticated) {
            router.push(whenUnauthenticated);
            return;
        }

        // Handle unverified user redirects
        if (isAuthenticated && !isVerified && whenUnverified) {
            router.push(whenUnverified);
            return;
        }

        // Handle role-based redirects
        if (
            isAuthenticated &&
            requiredRole &&
            !hasPermission(requiredRole) &&
            whenRoleMismatch
        ) {
            router.push(whenRoleMismatch);
            return;
        }
    }, [
        isAuthenticated,
        isVerified,
        whenAuthenticated,
        whenUnauthenticated,
        whenUnverified,
        requiredRole,
        whenRoleMismatch,
        router,
        hasPermission,
    ]);

    // This component doesn't render anything
    return null;
};

export default AuthRedirect;
