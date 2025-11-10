//eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Session, User } from "next-auth";
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: User & {
      id: string;
      role?: string;
      email_verified?: boolean;
      kycVerified?: boolean;
      hasPassword?: boolean;
      questionnaireCompleted?: boolean;
      name?: string;
      firstName?: string;
      lastName?: string;
      dob?: string;
      bio?: string;
      image?: string;
      email?: string;
    };
    accessToken?: string;
  }

  interface User {
    id: string;
    role?: string;
    token?: string;
    email_verified?: boolean;
    kycVerified?: boolean;
    hasPassword?: boolean;
    questionnaireCompleted?: boolean;
    givenName?: string;
    familyName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    accessToken?: string;
    email_verified?: boolean;
    error?: string;
  }
} 