import * as authService from '@/services/auth.service';
import type { Context } from '@/types/graphql';

export const authResolvers = {
    Query: {
        me: async (_, __, context: Context) => {
            if (!context.user?.id) return null;
            return await context.prisma.user.findUnique({
                where: { id: context.user.id },
                include: { profile: true }
            });
        },

        user: async (_, { id }: { id: string }, context: Context) => {
            return await context.prisma.user.findUnique({
                where: { id },
                include: { profile: true }
            });
        },

        // searchUsers: async (
        //     _,
        //     { searchTerm, limit = 5 }: { searchTerm: string; limit?: number },
        //     context: Context
        // ) => {
        //     if (!searchTerm || searchTerm.trim() === '') {
        //         return [];
        //     }

        //     return await context.prisma.user.findMany({
        //         where: {
        //             OR: [
        //                 { email: { contains: searchTerm, mode: 'insensitive' } },
        //                 { profile: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
        //                 { profile: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
        //             ],
        //         },
        //         include: { profile: true },
        //         take: limit,
        //     });
        // },

        profile: async (_, { userId }: { userId: string }, context: Context) => {
            return await context.prisma.profile.findUnique({
                where: { userId },
            });
        },

        getUserTwoFactorStatus: async (
            _,
            { userId }: { userId: string },
            context: Context
        ) => {
            // Check authentication
            if (!context.user || context.user.id !== userId) {
                return {
                    success: false,
                    message: 'Unauthorized',
                    twoFactorEnabled: false
                };
            }

            try {
                const user = await context.prisma.user.findUnique({
                    where: { id: userId },
                    select: { twoFactorEnabled: true }
                });

                if (!user) {
                    return {
                        success: false,
                        message: 'User not found',
                        twoFactorEnabled: false
                    };
                }

                return {
                    success: true,
                    twoFactorEnabled: user.twoFactorEnabled
                };
            } catch (error) {
                console.error('Error getting 2FA status:', error);
                return {
                    success: false,
                    message: 'Failed to get two-factor authentication status',
                    twoFactorEnabled: false
                };
            }
        },

        getBackupCodes: async (
            _,
            { userId }: { userId: string },
            context: Context
        ) => {
            // Check authentication
            if (!context.user || context.user.id !== userId) {
                return {
                    success: false,
                    message: 'Unauthorized',
                    backupCodes: []
                };
            }

            try {
                const user = await context.prisma.user.findUnique({
                    where: { id: userId },
                    include: { twoFactorAuth: true }
                });

                if (!user || !user.twoFactorEnabled || !user.twoFactorAuth) {
                    return {
                        success: false,
                        message: 'Two-factor authentication is not enabled',
                        backupCodes: []
                    };
                }

                return {
                    success: true,
                    backupCodes: user.twoFactorAuth.otpBackupCodes || []
                };
            } catch (error) {
                console.error('Error getting backup codes:', error);
                return {
                    success: false,
                    message: 'Failed to get backup codes',
                    backupCodes: []
                };
            }
        },

        getTrustedDevices: async (
            _,
            { userId }: { userId: string },
            context: Context
        ) => {
            // Check authentication
            if (!context.user || context.user.id !== userId) {
                return {
                    success: false,
                    message: 'Unauthorized',
                    devices: []
                };
            }

            try {
                const result = await authService.getTrustedDevices(userId);
                return result;
            } catch (error) {
                console.error('Error getting trusted devices:', error);
                return {
                    success: false,
                    message: 'Failed to get trusted devices',
                    devices: []
                };
            }
        },
    },

    Mutation: {
        register: async (_, { input }: { input }) => {
            try {
                const result = await authService.registerUser(
                    input.email,
                    input.password,
                    input.firstName,
                    input.lastName
                );
                return result;
            } catch (error) {
                console.error("Registration error:", error);
                return {
                    success: false,
                    message: "Failed to register user",
                    user: null,
                };
            }
        },

        resendVerificationEmail: async (_, { email }: { email: string }) => {
            try {
                const result = await authService.resendVerificationEmail(email);
                return result;
            } catch (error) {
                console.error("Resend verification email error:", error);
                return {
                    success: false,
                    message: "Failed to resend verification email",
                };
            }
        },

        login: async (
            _,
            { email, password, deviceToken }: { email: string; password: string; deviceToken?: string }
        ) => {
            try {
                const deviceTokenToUse = deviceToken || undefined;
                const result = await authService.loginUser(email, password, deviceTokenToUse);
                return result;
            } catch (error) {
                console.error("Login error:", error);
                return {
                    success: false,
                    message: "Failed to login",
                    token: null,
                    user: null,
                };
            }
        },

        check2FARequired: async (
            _,
            { email, password, deviceToken }: { email: string; password: string; deviceToken?: string }
        ) => {
            try {
                const result = await authService.check2FARequired(email, password, deviceToken);
                return result;
            } catch (error) {
                console.error("Check 2FA required error:", error);
                return {
                    success: false,
                    message: "Failed to check 2FA requirement",
                };
            }
        },

        logout: async (_, { token }: { token?: string }, ctx) => {
            try {
                // Use token from context if not provided in variables
                // This allows flexibility: can use Authorization header OR pass token explicitly
                const sessionToken = token || ctx.token;

                if (!sessionToken) {
                    return {
                        success: false,
                        message: "No authentication token provided",
                    };
                }

                const result = await authService.logoutUser(sessionToken);
                return result;
            } catch (error) {
                console.error("Logout error:", error);
                return {
                    success: false,
                    message: "Failed to logout",
                };
            }
        },

        verifySession: async (_, { token }: { token?: string }, ctx) => {
            try {
                // Use token from context if not provided in variables
                // This allows flexibility: can use Authorization header OR pass token explicitly
                const sessionToken = token || ctx.token;

                if (!sessionToken) {
                    return {
                        valid: false,
                        user: null,
                    };
                }

                const result = await authService.verifySession(sessionToken);
                return result;
            } catch (error) {
                console.error("Session verification error:", error);
                return {
                    valid: false,
                    user: null,
                };
            }
        },

        verifyEmail: async (_, { token }: { token: string }) => {
            try {
                const result = await authService.verifyEmail(token);
                return result;
            } catch (error) {
                console.error("Email verification error:", error);
                return {
                    success: false,
                    message: "Failed to verify email",
                };
            }
        },

        forgotPassword: async (_, { email }: { email: string }) => {
            try {
                const result = await authService.forgotPassword(email);
                return result;
            } catch (error) {
                console.error("Forgot password error:", error);
                return {
                    success: false,
                    message: "Failed to process forgot password request",
                };
            }
        },

        setPassword: async (
            _,
            { userId, password }: { userId: string; password: string },
            context: Context
        ) => {
            try {
                console.log("Setting password for user:", userId);
                console.log("COntext user:", context.user);
                // Authentication check
                if (!context.user || context.user.id !== userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                    };
                }

                const result = await authService.setPassword(userId, password);
                return result;
            } catch (error) {
                console.error("Set password error:", error);
                return {
                    success: false,
                    message: "Failed to set password",
                };
            }
        },

        resetPassword: async (
            _,
            { token, password }: { token: string; password: string }
        ) => {
            try {
                const result = await authService.resetPassword(token, password);
                return result;
            } catch (error) {
                console.error("Reset password error:", error);
                return {
                    success: false,
                    message: "Failed to reset password",
                };
            }
        },

        verifyPassword: async (
            _,
            { userId, password }: { userId: string; password: string },
            context: Context
        ) => {
            try {
                // Authentication check
                if (!context.user || context.user.id !== userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                    };
                }

                const result = await authService.verifyPassword(userId, password);
                return result;
            } catch (error) {
                console.error("Confirm password error:", error);
                return {
                    success: false,
                    message: "Failed to confirm password",
                };
            }
        },

        socialAuth: async (_, { input }: { input }) => {
            try {
                const result = await authService.socialAuth(
                    input.email,
                    input.provider,
                    input.providerId,
                    input.name,
                    input.firstName || "",
                    input.lastName || "",
                    input.avatarUrl || ""
                );
                return result;
            } catch (error) {
                console.error("Social authentication error:", error);
                return {
                    success: false,
                    message: "Failed to authenticate with social provider",
                    token: null,
                    user: null,
                };
            }
        },

        linkAccount: async (
            _,
            { userId, provider, providerId }: { userId: string; provider: string; providerId: string }
        ) => {
            try {
                const result = await authService.linkAccount(userId, provider, providerId);
                return result;
            } catch (error) {
                console.error("Account linking error:", error);
                return {
                    success: false,
                    message: "Failed to link account",
                };
            }
        },

        updateProfile: async (
            _,
            { userId, input }: { userId: string; input },
            context: Context
        ) => {
            try {
                // Authentication check
                if (!context.user || context.user.id !== userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                    };
                }

                // Convert null values to undefined for TypeScript compatibility
                const profile = {
                    firstName: input.firstName ?? undefined,
                    lastName: input.lastName ?? undefined,
                    bio: input.bio ?? undefined,
                    avatarUrl: input.avatarUrl ?? undefined,
                    dob: input.dob ?? undefined,
                };

                const result = await authService.updateUserProfile(userId, profile);
                return result;
            } catch (error) {
                console.error("Profile update error:", error);
                return {
                    success: false,
                    message: "Failed to update profile",
                };
            }
        },

        changePassword: async (
            _,
            { userId, currentPassword, newPassword }: { userId: string; currentPassword: string; newPassword: string },
            context: Context
        ) => {
            try {
                // Authentication check
                if (!context.user || context.user.id !== userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                    };
                }

                const result = await authService.changePassword(userId, currentPassword, newPassword);
                return result;
            } catch (error) {
                console.error("Password change error:", error);
                return {
                    success: false,
                    message: "Failed to change password",
                };
            }
        },

        deleteAccount: async (
            _,
            { userId }: { userId: string },
            context: Context
        ) => {
            try {
                // Authentication check
                if (!context.user || context.user.id !== userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                    };
                }

                const result = await authService.deleteAccount(userId);
                return result;
            } catch (error) {
                console.error("Account deletion error:", error);
                return {
                    success: false,
                    message: "Failed to delete account",
                };
            }
        },

        enableTwoFactor: async (
            _,
            { userId }: { userId: string },
            context: Context
        ) => {
            try {
                // Check authentication
                if (!context.user || context.user.id !== userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                        backupCodes: [],
                    };
                }

                const result = await authService.enableTwoFactor(userId);
                return result;
            } catch (error) {
                console.error("Enable 2FA error:", error);
                return {
                    success: false,
                    message: "Failed to enable two-factor authentication",
                    backupCodes: [],
                };
            }
        },

        disableTwoFactor: async (
            _,
            { userId }: { userId: string },
            context: Context
        ) => {
            try {
                // Check authentication
                if (!context.user || context.user.id !== userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                    };
                }

                const result = await authService.disableTwoFactor(userId);
                return result;
            } catch (error) {
                console.error("Disable 2FA error:", error);
                return {
                    success: false,
                    message: "Failed to disable two-factor authentication",
                };
            }
        },

        // generateOtp: async (_, { userId }: { userId: string }) => {
        //     try {
        //         const result = await authService.generateAndSendOtp(userId);
        //         return result;
        //     } catch (error) {
        //         console.error("Generate OTP error:", error);
        //         return {
        //             success: false,
        //             message: "Failed to generate OTP",
        //         };
        //     }
        // },

        verifyOtp: async (
            _,
            { userId, otp, tempToken, trustDevice, deviceName, deviceType, ipAddress }
        ) => {
            try {
                // Normalize the boolean
                const shouldTrustDevice = trustDevice === true;

                // Create deviceInfo object if needed
                let deviceInfo;
                if (shouldTrustDevice && deviceName) {
                    deviceInfo = {
                        name: deviceName,
                        type: deviceType || undefined,
                        ip: ipAddress || undefined,
                    };
                }

                const result = await authService.verifyOtp(
                    userId,
                    otp,
                    tempToken,
                    shouldTrustDevice,
                    deviceInfo
                );

                return result;
            } catch (error) {
                console.error("OTP verification error:", error);
                return {
                    success: false,
                    message: "Failed to verify OTP",
                };
            }
        },

        verifyBackupCode: async (
            _,
            { userId, backupCode, tempToken, trustDevice, deviceName, deviceType, ipAddress }
        ) => {
            try {
                // Normalize the boolean
                const shouldTrustDevice = trustDevice === true;

                // Create deviceInfo object if needed
                let deviceInfo;
                if (shouldTrustDevice && deviceName) {
                    deviceInfo = {
                        name: deviceName,
                        type: deviceType || undefined,
                        ip: ipAddress || undefined,
                    };
                }

                const result = await authService.verifyBackupCode(
                    userId,
                    backupCode,
                    tempToken,
                    shouldTrustDevice,
                    deviceInfo
                );

                return result;
            } catch (error) {
                console.error("Backup code verification error:", error);
                return {
                    success: false,
                    message: "Failed to verify backup code",
                };
            }
        },

        regenerateBackupCodes: async (
            _,
            { userId }: { userId: string },
            context: Context
        ) => {
            try {
                // Check authentication
                if (!context.user || context.user.id !== userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                        backupCodes: [],
                    };
                }

                const result = await authService.regenerateBackupCodes(userId);
                return result;
            } catch (error) {
                console.error("Regenerate backup codes error:", error);
                return {
                    success: false,
                    message: "Failed to regenerate backup codes",
                    backupCodes: [],
                };
            }
        },

        verifyKyc: async (
            _,
            { input }: { input: { userId: string; kycVerified: boolean } },
            context: Context
        ) => {
            try {
                // Check authentication
                if (!context.user || context.user.id !== input.userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                        user: null,
                    };
                }
                const user = await context.prisma.user.findUnique({
                    where: { id: input.userId },
                });

                if (!user) {
                    return {
                        success: false,
                        message: "User not found",
                        user: null,
                    };
                }

                const user2 = await context.prisma.user.update({
                    where: { id: input.userId },
                    data: { kycVerified: input.kycVerified },
                    include: { profile: true },

                });

                return {
                    success: true,
                    message: "KYC verification status updated successfully",
                    user: {
                        id: user2.id,
                        email: user2.email,
                        kycVerified: user2.kycVerified,
                    },
                };
            } catch (error) {
                console.error("KYC verification error:", error);
                return {
                    success: false,
                    message: "Failed to update KYC verification status",
                    user: null,
                };
            }
        },

        trustDevice: async (
            _,
            { userId, deviceName, deviceType, ipAddress },
            context: Context
        ) => {
            try {
                // Check authentication
                if (!context.user || context.user.id !== userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                    };
                }

                // Convert potentially null values to undefined
                const ipAddressValue = ipAddress || undefined;
                const deviceTypeValue = deviceType || undefined;

                const result = await authService.createTrustedDevice(
                    userId,
                    deviceName,
                    ipAddressValue,
                    deviceTypeValue
                );
                return result;
            } catch (error) {
                console.error("Trust device error:", error);
                return {
                    success: false,
                    message: "Failed to trust device",
                };
            }
        },

        removeTrustedDevice: async (
            _,
            { userId, deviceToken }: { userId: string; deviceToken: string },
            context: Context
        ) => {
            try {
                // Check authentication
                if (!context.user || context.user.id !== userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                    };
                }

                const result = await authService.removeTrustedDevice(deviceToken, userId);
                return result;
            } catch (error) {
                console.error("Remove trusted device error:", error);
                return {
                    success: false,
                    message: "Failed to remove trusted device",
                };
            }
        },
    },
};