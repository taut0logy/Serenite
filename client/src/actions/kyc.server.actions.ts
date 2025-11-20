"use server";

import prisma from "@/lib/prisma";

/**
 * Update user's KYC verification status in database
 */
export async function updateKycStatus(userId: string, kycVerified: boolean) {
    try {
        if (!userId) {
            return {
                success: false,
                message: "User ID is required",
            };
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return {
                success: false,
                message: "User not found",
            };
        }

        // Update KYC status
        await prisma.user.update({
            where: { id: userId },
            data: {
                kycVerified,
            },
        });

        return {
            success: true,
            message: kycVerified
                ? "KYC verification completed successfully"
                : "KYC verification status updated",
        };
    } catch (error) {
        console.error("Error updating KYC status:", error);
        return {
            success: false,
            message: "Failed to update KYC verification status",
        };
    }
}

/**
 * Get user's KYC verification status from database
 */
export async function getKycStatus(userId: string) {
    try {
        if (!userId) {
            return {
                success: false,
                message: "User ID is required",
                kycVerified: false,
            };
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                kycVerified: true,
            },
        });

        if (!user) {
            return {
                success: false,
                message: "User not found",
                kycVerified: false,
            };
        }

        return {
            success: true,
            message: "KYC status retrieved successfully",
            kycVerified: user.kycVerified,
        };
    } catch (error) {
        console.error("Error getting KYC status:", error);
        return {
            success: false,
            message: "Failed to get KYC verification status",
            kycVerified: false,
        };
    }
}
