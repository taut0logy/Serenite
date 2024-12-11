"use server" 

import { ResetSchema } from "@/schemas"
import * as z from "zod"
import { getUserByEmail } from "@/data/user"

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
  
// todo
  return {success: "Reset email sent!"}


}