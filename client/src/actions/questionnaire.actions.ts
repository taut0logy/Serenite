"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import axios from "@/lib/axios";

export async function saveQuestionnaireProgress(responses: Record<string, number>) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            throw new Error("User not authenticated");
        }

        // Prepare questionnaire data with JSON responses
        const questionnaireData = {
            userId: session.user.id,
            responses: responses, // Store raw responses as JSON
        };

        // Upsert questionnaire response (update if exists, create if not)
        const savedResponse = await prisma.questionnaireResponse.upsert({
            where: {
                userId: session.user.id,
            },
            update: {
                responses: responses,
                updatedAt: new Date(),
            },
            create: questionnaireData,
        });

        console.log("Questionnaire progress saved:", {
            userId: session.user.id,
            responseCount: Object.keys(responses).length,
            savedAt: new Date().toISOString()
        });

        return { success: true, data: savedResponse };
    } catch (error) {
        console.error("Error saving questionnaire progress:", error);
        return { success: false, error: "Failed to save progress" };
    }
}

export async function completeQuestionnaire(responses: Record<string, number>) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            throw new Error("User not authenticated");
        }

        // Save completed questionnaire with all responses
        const savedResponse = await prisma.questionnaireResponse.upsert({
            where: {
                userId: session.user.id,
            },
            update: {
                responses: responses,
                updatedAt: new Date(),
            },
            create: {
                userId: session.user.id,
                responses: responses,
            },
        });

        console.log("Questionnaire completed:", {
            userId: session.user.id,
            responseCount: Object.keys(responses).length,
            completedAt: new Date().toISOString()
        });

        // Call Python API for mental health profiling
        await generateMentalHealthProfile(responses);

        return { success: true, data: savedResponse };
    } catch (error) {
        console.error("Error completing questionnaire:", error);
        return { success: false, error: "Failed to complete questionnaire" };
    }
}

async function generateMentalHealthProfile(responses: Record<string, number>) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            throw new Error("User not authenticated");
        }

        //update questionaire response as completed
        await prisma.questionnaireResponse.update({
            where: {
                userId: session.user.id,
            },
            data: {
                isComplete: true,
            },
        });

        // Prepare the request body in the format expected by Python API
        const requestBody = {
            answers: responses
        };

        console.log("Sending to Python API:", {
            endpoint: "/mental-profile/",
            data: requestBody,
            responseCount: Object.keys(responses).length
        });

        // Call Python API for mental health profiling
        const response = await axios.post(`/mental-profile/`, requestBody);

        if (response.status !== 200) {
            throw new Error(`Python API error: ${response.statusText}`);
        }

        const profileResult = response.data;
        console.log("Received from Python API:", profileResult);

        // Save the mental health profile to database
        await prisma.mentalHealthProfile.upsert({
            where: {
                userId: session.user.id,
            },
            update: {
                tags: profileResult.tags || [],
                narrative_summary: profileResult.narrative_summary || "",
                recommendations: profileResult.recommendations || [],
                timestamp: new Date(),
            },
            create: {
                userId: session.user.id,
                tags: profileResult.tags || [],
                narrative_summary: profileResult.narrative_summary || "",
                recommendations: profileResult.recommendations || [],
                timestamp: new Date(),
            },
        });

        console.log("Mental health profile generated successfully");

        // Force session update by revalidating the path
        // This will trigger the session callback to refetch user data
        return { success: true };
    } catch (error) {
        console.error("Error generating mental health profile:", error);
        throw error;
    }
}

export async function getQuestionnaireProgress() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return { success: false, error: "User not authenticated" };
        }

        const response = await prisma.questionnaireResponse.findUnique({
            where: {
                userId: session.user.id,
            },
        });

        if (response && response.responses) {
            // Convert JSON responses back to Record<string, number>
            const responses = response.responses as Record<string, number>;
            return { success: true, data: responses };
        }

        return { success: true, data: null };
    } catch (error) {
        console.error("Error getting questionnaire progress:", error);
        return { success: false, error: "Failed to load progress" };
    }
}
