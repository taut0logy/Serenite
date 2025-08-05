"use server"

import { db } from "@/lib/db";
import { getUserByEmail } from "@/data/user";
import { getVerificationTokenByEmail, getVerificationTokenByToken } from "@/data/verification-token";

export const newVerification = async (token:string) => {
  const existingToken = await getVerificationTokenByToken(token);



  if(!existingToken){
    return { error: "Token does not exist!" };
  }
  const hasExpired = new Date() > new Date(existingToken.expires);

  if(hasExpired) {
    return { error: "Token has expired!" };
  }
  const existingUser = await getUserByEmail(existingToken.email);
  if(!existingToken){
    return { error: "Email does not exist!" };
  }

  await db.user.update({
    where: { email: existingToken.email },
    data: {emailVerified: new Date(),
      email:existingToken.email,
    }
  });

  await db.verificationToken.delete({
    where: { id: existingToken.id }
  });

  return { success: "Email verified!" };
}