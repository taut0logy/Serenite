"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { ClusterProfile } from "@/lib/profiling";
import { SeverityLevel } from "@prisma/client";

/**
 * Save encrypted questionnaire responses.
 * The encryption happens client-side with the user's password.
 * Server only stores the encrypted blob - it cannot read the responses.
 * 
 * This creates or updates the latest incomplete response for the user.
 */
export async function saveEncryptedResponses(
  encryptedData: string, // Base64 encoded encrypted data
  iv: string,            // Base64 encoded IV
  salt: string           // Base64 encoded salt
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    // Convert Base64 strings to Buffers for storage
    const encryptedBuffer = Buffer.from(encryptedData, "base64");
    const ivBuffer = Buffer.from(iv, "base64");
    const saltBuffer = Buffer.from(salt, "base64");

    // Find the latest incomplete response for this user
    const existingResponse = await prisma.questionnaireResponse.findFirst({
      where: { 
        userId: session.user.id,
        isComplete: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingResponse) {
      // Update existing incomplete response
      await prisma.questionnaireResponse.update({
        where: { id: existingResponse.id },
        data: {
          encryptedData: encryptedBuffer,
          iv: ivBuffer,
          salt: saltBuffer,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new response
      await prisma.questionnaireResponse.create({
        data: {
          userId: session.user.id,
          encryptedData: encryptedBuffer,
          iv: ivBuffer,
          salt: saltBuffer,
        },
      });
    }

    console.log("Encrypted questionnaire responses saved for user:", session.user.id);

    return { success: true };
  } catch (error) {
    console.error("Error saving encrypted responses:", error);
    return { success: false, error: "Failed to save responses" };
  }
}

/**
 * Get encrypted questionnaire responses.
 * Returns the latest incomplete response, or the most recent response if all are complete.
 */
export async function getEncryptedResponses(): Promise<{
  success: boolean;
  data?: {
    id: string;
    encryptedData: string; // Base64
    iv: string;            // Base64
    salt: string;          // Base64
    isComplete: boolean;
  };
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    // Get the latest incomplete response, or the most recent one
    const response = await prisma.questionnaireResponse.findFirst({
      where: { 
        userId: session.user.id,
        isComplete: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!response || !response.encryptedData) {
      return { success: true, data: undefined };
    }

    return {
      success: true,
      data: {
        id: response.id,
        encryptedData: response.encryptedData.toString("base64"),
        iv: response.iv?.toString("base64") ?? "",
        salt: response.salt?.toString("base64") ?? "",
        isComplete: response.isComplete,
      },
    };
  } catch (error) {
    console.error("Error getting encrypted responses:", error);
    return { success: false, error: "Failed to load responses" };
  }
}

/**
 * Complete the questionnaire by saving the mental health profile.
 * The profile (cluster scores) is computed client-side and sent as plaintext
 * for matching purposes. The raw responses remain encrypted.
 * 
 * @param profile - Cluster scores computed client-side from questionnaire responses
 * @param encryptedData - Base64 encoded encrypted responses (optional, may already be saved)
 * @param iv - Base64 encoded IV
 * @param salt - Base64 encoded salt
 */
export async function completeQuestionnaire(
  profile: ClusterProfile,
  encryptedData?: string,
  iv?: string,
  salt?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    // Use a transaction to ensure both updates succeed or fail together
    await prisma.$transaction(async (tx) => {
      // 1. Find or create the questionnaire response
      if (encryptedData && iv && salt) {
        const encryptedBuffer = Buffer.from(encryptedData, "base64");
        const ivBuffer = Buffer.from(iv, "base64");
        const saltBuffer = Buffer.from(salt, "base64");

        // Find existing incomplete response
        const existingResponse = await tx.questionnaireResponse.findFirst({
          where: { 
            userId: session.user.id,
            isComplete: false,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (existingResponse) {
          // Update and complete existing response
          await tx.questionnaireResponse.update({
            where: { id: existingResponse.id },
            data: {
              encryptedData: encryptedBuffer,
              iv: ivBuffer,
              salt: saltBuffer,
              isComplete: true,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new completed response
          await tx.questionnaireResponse.create({
            data: {
              userId: session.user.id,
              encryptedData: encryptedBuffer,
              iv: ivBuffer,
              salt: saltBuffer,
              isComplete: true,
            },
          });
        }
      } else {
        // Just mark the latest incomplete response as complete
        const existingResponse = await tx.questionnaireResponse.findFirst({
          where: { 
            userId: session.user.id,
            isComplete: false,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (existingResponse) {
          await tx.questionnaireResponse.update({
            where: { id: existingResponse.id },
            data: { isComplete: true },
          });
        }
      }

      // 2. Save mental health profile (cluster scores - plaintext for matching)
      await tx.mentalHealthProfile.upsert({
        where: { userId: session.user.id },
        update: {
          distress: profile.distress,
          fearAvoidance: profile.fearAvoidance,
          traumaStress: profile.traumaStress,
          cognitivePatterns: profile.cognitivePatterns,
          dailyFunctioning: profile.dailyFunctioning,
          overallSeverity: profile.overallSeverity as SeverityLevel,
          requiresClinicalReview: profile.requiresClinicalReview,
          timestamp: new Date(),
        },
        create: {
          userId: session.user.id,
          distress: profile.distress,
          fearAvoidance: profile.fearAvoidance,
          traumaStress: profile.traumaStress,
          cognitivePatterns: profile.cognitivePatterns,
          dailyFunctioning: profile.dailyFunctioning,
          overallSeverity: profile.overallSeverity as SeverityLevel,
          requiresClinicalReview: profile.requiresClinicalReview,
        },
      });
    });

    console.log("Questionnaire completed for user:", session.user.id, {
      severity: profile.overallSeverity,
      requiresClinicalReview: profile.requiresClinicalReview,
    });

    return { success: true };
  } catch (error) {
    console.error("Error completing questionnaire:", error);
    return { success: false, error: "Failed to complete questionnaire" };
  }
}

/**
 * Check if user has completed the questionnaire (at least one completed response)
 */
export async function hasCompletedQuestionnaire(): Promise<{
  success: boolean;
  completed?: boolean;
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const completedResponse = await prisma.questionnaireResponse.findFirst({
      where: { 
        userId: session.user.id,
        isComplete: true,
      },
      select: { id: true },
    });

    return { success: true, completed: !!completedResponse };
  } catch (error) {
    console.error("Error checking questionnaire completion:", error);
    return { success: false, error: "Failed to check completion status" };
  }
}

/**
 * Get user's mental health profile (cluster scores only - no raw responses)
 */
export async function getMentalHealthProfile(): Promise<{
  success: boolean;
  profile?: {
    distress: number;
    fearAvoidance: number;
    traumaStress: number;
    cognitivePatterns: number;
    dailyFunctioning: number;
    overallSeverity: string;
    requiresClinicalReview: boolean;
  };
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const profile = await prisma.mentalHealthProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return { success: true, profile: undefined };
    }

    return {
      success: true,
      profile: {
        distress: profile.distress,
        fearAvoidance: profile.fearAvoidance,
        traumaStress: profile.traumaStress,
        cognitivePatterns: profile.cognitivePatterns,
        dailyFunctioning: profile.dailyFunctioning,
        overallSeverity: profile.overallSeverity,
        requiresClinicalReview: profile.requiresClinicalReview,
      },
    };
  } catch (error) {
    console.error("Error getting mental health profile:", error);
    return { success: false, error: "Failed to get profile" };
  }
}

/**
 * Get all questionnaire responses for a user (for progress tracking)
 */
export async function getQuestionnaireHistory(): Promise<{
  success: boolean;
  responses?: {
    id: string;
    createdAt: Date;
    isComplete: boolean;
  }[];
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const responses = await prisma.questionnaireResponse.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        isComplete: true,
      },
    });

    return { success: true, responses };
  } catch (error) {
    console.error("Error getting questionnaire history:", error);
    return { success: false, error: "Failed to get history" };
  }
}

/**
 * Start a new questionnaire (for tracking progress over time)
 */
export async function startNewQuestionnaire(): Promise<{
  success: boolean;
  responseId?: string;
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const response = await prisma.questionnaireResponse.create({
      data: {
        userId: session.user.id,
      },
    });

    return { success: true, responseId: response.id };
  } catch (error) {
    console.error("Error starting new questionnaire:", error);
    return { success: false, error: "Failed to start questionnaire" };
  }
}
