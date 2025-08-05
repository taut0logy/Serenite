"use server" 

import { ResetSchema } from "@/schemas"
import * as z from "zod"
import { getUserByEmail } from "@/data/user"
import { sendPasswordResetEmail } from "@/lib/mail"

import { generatePasswordResetToken } from "@/lib/tokens"

export const reset = async (values : z.infer<typeof ResetSchema>) => {
  const validatedFeilds = ResetSchema.safeParse(values);

  if(!validatedFeilds.success){
    return {error: "Invalid email!"}
  }

  const { email} = validatedFeilds.data;

  const existingUser = await getUserByEmail(email);

  if(!existingUser){
    return {error: "No user with that email found!"}
  }
  
  const passwordResetToken = await generatePasswordResetToken(email);
  await sendPasswordResetEmail(passwordResetToken.email, passwordResetToken.token);


  return {success: "Reset email sent!"}


}