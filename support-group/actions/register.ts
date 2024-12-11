"use server";
import * as z from "zod";
import { RegisterSchema } from "@/schemas";
import bcrypt from "bcryptjs";
import { generateVerificationToken } from "@/lib/tokens";

import { db } from "@/lib/db";
import { getUserByEmail, getUserByUsername } from "@/data/user";


export const register = async (values: z.infer<typeof RegisterSchema>) => {
  const validatedFields = RegisterSchema.parse(values);

  if (!validatedFields) {
    return { error: "Invalid fields" };
  }

  const { email, name, username, password } = validatedFields;

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await getUserByEmail(email);
  const existingUserByUsername = await getUserByUsername(username);


  if (existingUser) {
    return { error: "Email already in use!" };
  }

  if (existingUserByUsername) {
    return { error: "Username already in use!" };
  }

  await db.user.create({
    data: {
      email,
      name,
      username,
      password: hashedPassword,
    }
    
  });

    const verificationToken = await generateVerificationToken(email);


  return { success : "Verification Token sent!" };


  return { success: "Email sent!" };
};
