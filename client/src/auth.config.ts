
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/auth/register",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 60 * 60, // 1 hour
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
        const isLoggedIn = !!auth?.user;
        const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
        if (isOnDashboard) {
            if (isLoggedIn) return true;
            return false; // Redirect unauthenticated users to login page
        } else if (isLoggedIn) {
            // return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
    },
    async session({ session, token }) {
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = token?.profile as any;

      session.user = {
        ...session.user,
        id: token?.sub || "",
        email: (token?.email as string) || "",
        image: token?.picture as string | undefined,
        role: token?.role as string | undefined,
        email_verified: (token?.email_verified as boolean) || false,
        emailVerified: null, // Required by AdapterUser
        hasPassword: (token?.hasPassword as boolean) || false,
        kycVerified: (token?.kycVerified as boolean) || false,
        twoFactorEnabled: (token?.twoFactorEnabled as boolean) || false,
        questionnaireCompleted: (token?.questionnaireCompleted as boolean) || false,
        // Profile data from database
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        bio: profile?.bio,
        dob: profile?.dob,
        avatarUrl: profile?.avatarUrl,
      };

      session.accessToken = token.accessToken as string;

      return session;
    },
  },
  providers: [], // Configured in auth.ts
  debug: true,
} satisfies NextAuthConfig;
