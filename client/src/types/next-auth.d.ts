//eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Session, User } from "next-auth";
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JWT } from "next-auth/jwt";

interface ProfileType {
  firstName?: string;
  lastName?: string;
  bio?: string;
  dob?: string;
  avatarUrl?: string;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      image?: string;
      role?: string;
      email_verified?: boolean;
      kycVerified?: boolean;
      twoFactorEnabled?: boolean;
      hasPassword?: boolean;
      questionnaireCompleted?: boolean;
      // Profile fields from database
      firstName?: string;
      lastName?: string;
      bio?: string;
      dob?: string;
      avatarUrl?: string;
    };
    accessToken?: string;
  }

  interface User {
    id: string;
    email?: string;
    image?: string;
    role?: string;
    token?: string;
    email_verified?: boolean;
    kycVerified?: boolean;
    hasPassword?: boolean;
    questionnaireCompleted?: boolean;
    twoFactorEnabled?: boolean;
    profile?: ProfileType;
    // OAuth provider-specific fields
    givenName?: string;
    familyName?: string;
    login?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    accessToken?: string;
    email_verified?: boolean;
    hasPassword?: boolean;
    kycVerified?: boolean;
    twoFactorEnabled?: boolean;
    questionnaireCompleted?: boolean;
    profile?: {
      firstName?: string;
      lastName?: string;
      bio?: string;
      dob?: string;
      avatarUrl?: string;
    };
    error?: string;
  }
} 