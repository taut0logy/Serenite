/**
 * Auth Module - Central Auth Configuration
 *
 * This file serves as the main entry point for authentication in the application.
 * It exports:
 * - auth: NextAuth function used for route protection
 * - signIn/signOut: Functions for server-side authentication
 * - handlers: Handlers for API routes
 *
 * How the auth system works:
 * 1. NextAuth is initialized here with configuration (providers, callbacks, etc.)
 * 2. The route.ts file imports the handlers for API routes
 * 3. The middleware.ts file imports the auth function for route protection
 */

import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getClient } from "@/lib/apollo-client";
import type { User } from "next-auth";
import { LOGIN, VERIFY_SESSION, SOCIAL_AUTH, CHECK_2FA_REQUIRED } from "@/graphql/operations";
import { VERIFY_2FA_TOKEN } from "@/graphql/operations/queries";

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
          // console.log("NextAuth authorize credentials:", {
          //   hasEmail: !!credentials.email,
          //   hasPassword: !!credentials.password,
          //   hasDeviceToken: !!credentials.deviceToken,
          //   hasTwoFactorToken: !!credentials.twoFactorToken,
          //   hasToken: !!credentials.token,
          //   hasUserId: !!credentials.userId,
          // });

          const apolloClient = getClient();

          // Case 1: Direct token login (coming from 2FA verification)
          if (credentials.token && credentials.userId) {
            const { data } = await apolloClient.mutate({
              mutation: VERIFY_SESSION,
              variables: {
                token: credentials.token,
              },
            });

            const response = data?.verifySession || {};

            if (response.valid && response.user) {
              const userProfile = response.user.profile || {};

              return {
                id: response.user.id,
                email: response.user.email || "",
                image: userProfile.avatarUrl || "",
                token: credentials.token,
                role: response.user.role || "USER",
                email_verified: response.user.verified || false,
                hasPassword: response.user.hasPassword || false,
              } as User;
            }

            return null;
          }

          // Case 2: 2FA verification flow (post-OTP verification)
          if (credentials.twoFactorToken && credentials.email) {
            const { data } = await apolloClient.query({
              query: VERIFY_2FA_TOKEN,
              variables: {
                token: credentials.twoFactorToken,
              },
            });

            const response = data?.verify2FAToken || {};

            if (response.valid && response.user) {
              const userProfile = response.user.profile || {};

              return {
                id: response.user.id,
                email: response.user.email || "",
                image: userProfile.avatarUrl || "",
                token: credentials.twoFactorToken,
                role: response.user.role || "USER",
                email_verified: response.user.verified || false,
                hasPassword: response.user.hasPassword || false,
              } as User;
            }

            return null;
          }

          // Case 3: Regular login flow
          if (!credentials.email || !credentials.password) return null;

          // Get device token if provided in credentials
          const deviceToken = credentials.deviceToken || undefined;

          //console.log("Checking 2FA with device token:", !!deviceToken);

          // First check if 2FA is required
          const { data: checkData } = await apolloClient.mutate({
            mutation: CHECK_2FA_REQUIRED,
            variables: {
              email: credentials.email,
              password: credentials.password,
              deviceToken,
            },
          });

          const checkResult = checkData?.check2FARequired || {};
          // console.log("2FA check result:", {
          //   success: checkResult.success,
          //   requiresTwoFactor: checkResult.requiresTwoFactor,
          // });

          // If 2FA is not required or user has a trusted device, we can proceed with login
          if (checkResult.success && !checkResult.requiresTwoFactor) {
            //console.log("Proceeding with login, bypassing 2FA");
            // Perform the actual login
            const { data } = await apolloClient.mutate({
              mutation: LOGIN,
              variables: {
                email: credentials.email,
                password: credentials.password,
                deviceToken,
              },
            });

            // Extract the response from the array that's returned by the server
            const response = data?.login || {};

            //console.log("Login Mutation response: ", response);

            if (response.token && response.user) {
              const userProfile = response.user.profile || {};

              return {
                id: response.user.id,
                email: response.user.email || "",
                image: userProfile.avatarUrl || "",
                token: response.token,
                role: response.user.role || "USER",
                email_verified: response.user.verified || false,
                hasPassword: response.user.hasPassword || false,
              } as User;
            }
          }

          // If we reach here, it means 2FA is required
          // console.log("2FA required");
          return null;
  
        } catch (error) {
          console.error("Login error:", error);
          return null; // Return null to indicate failure
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
          email: profile.email,
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
        const apolloClient = getClient();

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

        // Call the socialAuth mutation
        const { data } = await apolloClient.mutate({
          mutation: SOCIAL_AUTH,
          variables: { input },
        });

        // Extract the response from the array
        const response = data?.socialAuth || {};

        if (response.success) {
          user.token = response.token;
          user.id = response.user.id;
          user.role = response.user.role;
          user.email_verified = true;
          user.hasPassword = response.user.hasPassword || false;

          return true;
        }

        return false;
      } catch (error) {
        console.error("Social auth error:", error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      // console.log("JWT callback", {
      //   user: user,
      //   hasAccount: !!account,
      //   tokenFields: token,
      // });

      // Initial sign in
      if (account && user) {
        //console.log("Initial signin: ", user);
        return {
          ...token,
          sub: user.id,
          accessToken: user.token,
          email: user.email,
          picture: user.image || "",
          role: user.role || "USER",
          email_verified: user.email_verified || false,
          hasPassword: user.hasPassword || false,
        };
      }
      // Return the token as is
      return token;
    },
    async session({ session, token }) {
      // console.log("Session callback", {
      //   hasToken: !!token,
      //   sessionFields: session,
      //   tokenFields: token,
      // });

      let user;

      try {
        const apolloClient = getClient();
        const { data } = await apolloClient.mutate({
          mutation: VERIFY_SESSION,
          variables: {
            token: token.accessToken,
          },
        });

        const response = data?.verifySession || {};

        //console.log("Session verification response: ", response);

        if (response.valid && response.user) {

          user = {
            id: response.user.id,
            email: response.user.email || "",
            firstName: response.user.profile?.firstName || "User",
            lastName: response.user.profile?.lastName,
            bio: response.user.profile?.bio || "",
            dob: response.user.profile?.dob,
            image: response.user.profile?.avatarUrl || "",
            role: response.user.role || "USER",
            email_verified: response.user.verified || false,
            hasPassword: response.user.hasPassword || false,
          };
        }
      } catch (error) {
        console.error("Token verification error:", error);
        user = {
          id: token?.sub || "",
          name: token?.name,
          firstName: token?.firstName,
          lastName: token?.lastName,
          email: token?.email,
          image: token?.picture,
          role: token?.role || "USER",
          bio: token?.bio,
          email_verified: token?.email_verified || false,
          hasPassword: token?.hasPassword || false,
        };
      }

      const res = {
        ...session,
        user,
        accessToken: token.accessToken
      };

      //console.log("Current Session:", res);

      return res;
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
  debug: process.env.NODE_ENV === "development",
});
