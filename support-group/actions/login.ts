"use server";
import * as z from "zod";
import { LoginSchema } from "@/schemas";
import { signIn } from "@/auth";
import { signOut } from "@/auth";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { AuthError } from "next-auth";
import { getTwoFactorTokenByEmail } from "@/data/two-factor-token";
import {
  generateVerificationToken,
  generateTwoFactorToken
} from "@/lib/tokens";
import { getUserByEmail } from "@/data/user";
import { db } from "@/lib/db";
import { sendVerificationEmail, sendTwoFactorTokenEmail } from "@/lib/mail";
import { getTwoFactorConfirmationByUserId } from "@/data/two-factor-confirmation";
import { UserRole } from "@prisma/client";

export const login = async (values: z.infer<typeof LoginSchema>) => {
  const validatedFields = LoginSchema.parse(values);

  if (!validatedFields) {
    return { error: "Invalid fields" };
  }

  const { email, password, code } = validatedFields;

  const existingUser = await getUserByEmail(email);

  if (!existingUser || !existingUser.email || !existingUser.password) {
    return { error: "Email does not exist!" };
  }

  if (!existingUser.emailVerified) {
    const verificationToken = await generateVerificationToken(existingUser.email);

    await sendVerificationEmail(verificationToken.email, verificationToken.token,);

    return { success: "Confirmation email sent!" };
  }

  if (existingUser.isTwoFactorEnabled && existingUser.email) {
    if (code) {
      const twoFactorToken = await getTwoFactorTokenByEmail(existingUser.email);

      if (!twoFactorToken ) {
        return { error: "Invalid two factor code" };
      }

      if (twoFactorToken.token !== code) {
        return { error: "Invalid two factor code" };
      }

      const hasExpired = new Date(twoFactorToken.expires) < new Date();

      if(hasExpired){
        return { error: "Two factor code has expired" };
      }

      await db.twoFactorToken.delete({
        where: {
          id: twoFactorToken.id
        }
      });

      const existingConfirmation = await getTwoFactorConfirmationByUserId(existingUser.id);

      if(existingConfirmation){
        await db.twoFactorConfirmation.delete({
          where: {
            id: existingConfirmation.id
          }
        })
      }

      await db.twoFactorConfirmation.create({
        data: {
          userId: existingUser.id
        }
      });
      






    } else {


      const twoFactorToken = await generateTwoFactorToken(existingUser.email);

      await sendTwoFactorTokenEmail(twoFactorToken.email, twoFactorToken.token);

      return { twoFactor: true };
    }
  }




  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: getRedirectPathByRole(existingUser.role),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials" };
        default:
          return { error: "Something went wrong!" };
      }
    }

    throw error;
  }
};


/**
 * Get the redirect path based on the user role
 * @param {UserRole} role
 * @returns {string}
 */
const getRedirectPathByRole = (role: UserRole): string => {
  switch (role) {
    case "USER":
      return "/user/dashboard";
    case "PREMIUM_USER":
      return "/premium-user/dashboard";
    case "SUPER_ADMIN":
      return "/super-admin/dashboard";
    case "FAQ_MANAGER":
      return "/faq-manager/dashboard";
    case "REPORT_MANAGER":
      return "/report-manager/dashboard";
    case "CONSULTANT_MANAGER":
      return "/consultant-manager/dashboard";
    case "CONSULTANT":
      return "/consultant/dashboard";
    case "GENERAL_MANAGER":
      return "/general-manager/dashboard";
    default:
      return DEFAULT_LOGIN_REDIRECT;
  }
};