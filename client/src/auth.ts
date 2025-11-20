/**
 * Auth Module - Optimized Server Actions Based Configuration
 *
 * This file serves as the main entry point for authentication in the application.
 * It exports:
 * - auth: NextAuth function used for route protection
 * - signIn/signOut: Functions for server-side authentication
 * - handlers: Handlers for API routes
 *
 * Optimizations:
 * - Uses server actions directly (no GraphQL)
 * - Minimizes client-server round trips
 * - Automatic session refresh on profile updates
 * - Edge runtime compatible
 */

import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { User } from "next-auth";
import {
  verifySession,
  check2FARequired,
  socialAuth,
  logoutUser,
} from "@/actions/auth.actions";

// Helper to serialize profile data for JWT storage
//eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeProfile(profile: any) {
  if (!profile) return undefined;
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    bio: profile.bio,
    dob: profile.dob ? new Date(profile.dob).toISOString() : undefined,
    avatarUrl: profile.avatarUrl,
  };
}

// Debug current environment variables (without exposing secrets)
// console.log("Auth.ts: Environment check", {
//   hasAuthSecret: !!process.env.AUTH_SECRET,
//   env: process.env.NODE_ENV,
//   hasGithubId: !!process.env.GITHUB_CLIENT_ID,
//   hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
// });

/**
 * NextAuth configuration
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorToken: { label: "2FA Token", type: "text" },
        token: { label: "Token", type: "text" },
        userId: { label: "User ID", type: "text" },
        deviceToken: { label: "Device Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        try {
          let response;

          // Case 1 & 2: Token-based login (from 2FA verification or direct token)
          if (credentials.token || credentials.twoFactorToken) {
            const token = (credentials.token || credentials.twoFactorToken) as string;
            response = await verifySession(token);

            if (response.valid && response.user) {
              return {
                id: response.user.id,
                email: response.user.email,
                token: token,
                role: response.user.role,
                email_verified: response.user.verified,
                hasPassword: response.user.hasPassword,
                kycVerified: response.user.kycVerified,
                questionnaireCompleted: response.user.questionnaireCompleted,
                twoFactorEnabled: response.user.twoFactorEnabled,
                profile: response.user.profile,
              } as User;
            }
            return null;
          }

          // Case 3: Email/password login (fallback - client should check 2FA first)
          if (credentials.email && credentials.password) {
            const checkResult = await check2FARequired(
              credentials.email as string,
              credentials.password as string,
              credentials.deviceToken as string | undefined
            );

            // 2FA required - client should handle this
            if (checkResult.success && checkResult.requiresTwoFactor) {
              console.warn("2FA required but client didn't check first");
              return null;
            }

            // Login successful
            if (checkResult.success && checkResult.token && checkResult.user) {
              return {
                id: checkResult.user.id,
                email: checkResult.user.email,
                token: checkResult.token,
                role: checkResult.user.role,
                email_verified: checkResult.user.verified,
                hasPassword: checkResult.user.hasPassword,
                kycVerified: checkResult.user.kycVerified,
                twoFactorEnabled: checkResult.user.twoFactorEnabled,
                questionnaireCompleted: checkResult.user.questionnaireCompleted,
                profile: checkResult.user.profile,
              } as User;
            }
          }

          return null;
        } catch (error) {
          console.error("Login error:", error);
          return null;
        }
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email || undefined,
          image: profile.avatar_url,
          // Additional GitHub-specific fields
          login: profile.login,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // Additional Google-specific fields
          givenName: profile.given_name,
          familyName: profile.family_name,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only handle OAuth providers here
      if (!account || account.provider === "credentials") {
        return true;
      }

      //console.log("Auth callback", { user, account, profile });

      // Make sure the user object has all necessary fields
      if (!user?.email) {
        return false;
      }

      try {
        // Extract name parts based on provider
        let firstName = "";
        let lastName = "";

        if (account.provider === "github" && profile) {
          // For GitHub, try to split the name if available
          if (user.name) {
            const nameParts = user.name.split(" ");
            firstName = nameParts[0] || "User";
            lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
          } else {
            // Fallback to login
            firstName = "User";
            lastName = "";
          }
        } else if (account.provider === "google") {
          // For Google, we have structured name data
          firstName = user.givenName || "User";
          lastName = user.familyName || "";
        }

        // Create input for socialAuth mutation
        const input = {
          email: user.email,
          provider: account.provider,
          providerId: account.providerAccountId || "",
          name: user.name || "",
          firstName,
          lastName,
          avatarUrl: user.image || "",
        };

        // Call the social auth server action directly
        const response = await socialAuth(
          input.email,
          input.provider,
          input.providerId,
          input.name,
          input.firstName,
          input.lastName,
          input.avatarUrl
        );

        if (response.success) {
          // Set user properties that will be used in JWT callback
          user.token = response.token;
          user.id = response.user.id;
          user.role = response.user.role;
          user.email_verified = true;
          user.hasPassword = response.user.hasPassword || false;
          user.kycVerified = response.user.kycVerified || false;
          user.twoFactorEnabled = response.user.twoFactorEnabled || false;
          user.questionnaireCompleted = response.user.questionnaireCompleted || false;
          user.image = response.user.profile?.avatarUrl || undefined;
          //eslint-disable-next-line @typescript-eslint/no-explicit-any
          (user as any).profile = response.user.profile;

          return true;
        }

        return false;
      } catch (error) {
        console.error("Social auth error:", error);
        return false;
      }
    },
    async jwt({ token, user, account, trigger }) {
      // Initial sign in - store user data in token
      if (account && user) {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userAny = user as any;
        return {
          ...token,
          sub: user.id,
          accessToken: user.token,
          email: user.email,
          picture: userAny.profile?.avatarUrl,
          role: user.role || "USER",
          email_verified: user.email_verified,
          hasPassword: user.hasPassword,
          kycVerified: user.kycVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          questionnaireCompleted: userAny.questionnaireCompleted,
          profile: serializeProfile(userAny.profile),
          lastUpdate: Date.now(),
        };
      }

      // Refresh data when update is triggered or periodically (every 5 min)
      const lastUpdate = (token.lastUpdate as number) || 0;
      const now = Date.now();
      const shouldRefresh = trigger === "update" || (now - lastUpdate > 5 * 60 * 1000);

      if (shouldRefresh && token.accessToken) {
        try {
          const response = await verifySession(token.accessToken as string);

          if (response.valid && response.user) {
            return {
              ...token,
              email: response.user.email,
              picture: response.user.profile?.avatarUrl,
              role: response.user.role,
              email_verified: response.user.verified,
              hasPassword: response.user.hasPassword,
              kycVerified: response.user.kycVerified,
              twoFactorEnabled: response.user.twoFactorEnabled,
              questionnaireCompleted: response.user.questionnaireCompleted,
              profile: serializeProfile(response.user.profile),
              lastUpdate: Date.now(),
            };
          }
          // Token invalid - force re-login
          return null;
        } catch (error) {
          console.error("Error refreshing token:", error);
          return token;
        }
      }

      return token;
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
  events: {
    async signOut(message) {
      // Delete the session from database when user logs out
      if ("token" in message && message.token?.accessToken) {
        try {
          await logoutUser(message.token.accessToken as string);
        } catch (error) {
          console.error("Error during signOut event:", error);
        }
      }
    },
  },
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
  debug: true,
});
