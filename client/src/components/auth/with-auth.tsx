import { useAuth } from "@/hooks/use-auth";
import { ComponentType } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";

// Types for the authentication HOC options
export interface WithAuthOptions {
    requireAuth?: boolean;
    requireVerified?: boolean;
    redirectUnauthenticated?: string;
    redirectAuthenticated?: string;
}

/**
 * Higher Order Component that handles authentication logic
 *
 * @param WrappedComponent The component to wrap with authentication
 * @param options Authentication options
 * @returns A new component with authentication handling
 */
export function withAuth<P extends object>(
    WrappedComponent: ComponentType<P>,
    options: WithAuthOptions = {}
) {
    const {
        requireAuth = true,
        requireVerified = false,
        redirectUnauthenticated = "/auth/login",
        redirectAuthenticated,
    } = options;

    // Create a new component that includes authentication logic
    function WithAuthComponent(props: P) {
        const { isAuthenticated, isVerified, isLoading } = useAuth({
            required: requireAuth,
            verifiedRequired: requireVerified,
            redirectTo: redirectUnauthenticated,
            redirectIfFound: !!redirectAuthenticated,
        });

        // Show loading state while checking authentication
        if (isLoading) {
            return <LoadingScreen />;
        }

        // Handle authentication redirects
        if (requireAuth && !isAuthenticated) {
            return null; // Redirect is handled by useAuth hook
        }

        // Handle verification redirects
        if (requireAuth && requireVerified && !isVerified) {
            return null; // Redirect is handled by useAuth hook
        }

        // Handle redirecting authenticated users away from certain pages
        if (redirectAuthenticated && isAuthenticated) {
            return null; // Redirect is handled by useAuth hook
        }

        // Render the protected component
        return <WrappedComponent {...props} />;
    }

    // Set display name for debugging
    const displayName =
        WrappedComponent.displayName || WrappedComponent.name || "Component";
    WithAuthComponent.displayName = `WithAuth(${displayName})`;

    return WithAuthComponent;
}

/**
 * HOC that redirects authenticated users away from a page
 * Example: Login page should redirect to dashboard if already logged in
 */
export function withPublicRoute<P extends object>(
    Component: ComponentType<P>,
    redirectTo = "/dashboard"
) {
    return withAuth(Component, {
        requireAuth: false,
        redirectAuthenticated: redirectTo,
    });
}

/**
 * HOC that requires authentication but not verification
 * Example: General dashboard pages that any logged-in user can see
 */
export function withProtectedRoute<P extends object>(
    Component: ComponentType<P>,
    redirectTo = "/auth/login"
) {
    return withAuth(Component, {
        requireAuth: true,
        requireVerified: false,
        redirectUnauthenticated: redirectTo,
    });
}

/**
 * HOC that requires both authentication and email verification
 * Example: Pages for creating meetings or accessing premium features
 */
export function withVerifiedRoute<P extends object>(
    Component: ComponentType<P>,
    redirectTo = "/auth/login"
) {
    return withAuth(Component, {
        requireAuth: true,
        requireVerified: true,
        redirectUnauthenticated: redirectTo,
    });
}

export default withAuth;
