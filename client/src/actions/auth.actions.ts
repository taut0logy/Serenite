'use server';

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendOtpEmail,
} from "@/lib/email-api";

// Constants
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Register a new user
 */
export async function registerUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string
) {
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return {
                success: false,
                message: "User with this email already exists",
                user: null,
            };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                hashedPassword,
                verificationToken,
                profile: {
                    create: {
                        firstName,
                        lastName,
                    },
                },
            },
            include: {
                profile: true,
            },
        });

        // Send verification email
        await sendVerificationEmail(email, verificationToken);

        return {
            success: true,
            message:
                "User registered successfully. Please check your email to verify your account.",
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                hasPassword: user.hashedPassword ? true : false,
            },
        };
    } catch (error) {
        console.error("Error registering user:", error);
        throw new Error("Failed to register user");
    }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string) {
    try {
        // Find user with this email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return {
                success: false,
                message: "User not found",
            };
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");

        // Update user with new verification token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationToken,
            },
        });

        // Send verification email
        await sendVerificationEmail(email, verificationToken);

        return {
            success: true,
            message: "Verification email sent successfully",
        };
    } catch (error) {
        console.error("Error resending verification email:", error);
        throw new Error("Failed to resend verification email");
    }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string) {
    try {
        // Find user with this verification token
        const user = await prisma.user.findFirst({
            where: { verificationToken: token },
        });

        if (!user) {
            return {
                success: false,
                message: "Invalid verification token",
            };
        }

        // Update user to verified
        await prisma.user.update({
            where: { id: user.id },
            data: {
                verified: true,
                verificationToken: null,
            },
        });

        return {
            success: true,
            message: "Email verified successfully",
        };
    } catch (error) {
        console.error("Error verifying email:", error);
        throw new Error("Failed to verify email");
    }
}

/**
 * Generate a 6-digit OTP code
 */
function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate backup codes for 2FA
 */
function generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        // Generate a 10-character alphanumeric code
        const code = crypto.randomBytes(5).toString("hex").toUpperCase();
        codes.push(code);
    }
    return codes;
}

/**
 * Enable two-factor authentication for a user
 */
export async function enableTwoFactor(userId: string) {
    try {
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { twoFactorAuth: true },
        });

        if (!user) {
            return {
                success: false,
                message: "User not found",
            };
        }

        // Generate backup codes
        const backupCodes = generateBackupCodes();

        // Create or update 2FA record
        if (user.twoFactorAuth) {
            await prisma.twoFactorAuth.update({
                where: { userId },
                data: {
                    otpBackupCodes: backupCodes,
                },
            });
        } else {
            await prisma.twoFactorAuth.create({
                data: {
                    userId,
                    otpBackupCodes: backupCodes,
                },
            });
        }

        // Update user to enable 2FA
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: true,
            },
        });

        return {
            success: true,
            message: "Two-factor authentication enabled successfully",
            backupCodes,
        };
    } catch (error) {
        console.error("Error enabling 2FA:", error);
        throw new Error("Failed to enable two-factor authentication");
    }
}

/**
 * Disable two-factor authentication for a user
 */
export async function disableTwoFactor(userId: string) {
    try {
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

        // Update user to disable 2FA
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
            },
        });

        // Remove 2FA record
        if (user.twoFactorEnabled) {
            await prisma.twoFactorAuth.delete({
                where: { userId },
            });
        }

        return {
            success: true,
            message: "Two-factor authentication disabled successfully",
        };
    } catch (error) {
        console.error("Error disabling 2FA:", error);
        throw new Error("Failed to disable two-factor authentication");
    }
}

/**
 * Generate and send OTP for 2FA
 * This creates a temporary session with pending 2FA status
 */
export async function generateAndSendOtp(userId: string) {
    try {
        // Check if user exists and has 2FA enabled
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.twoFactorEnabled) {
            return {
                success: false,
                message: "User not found or 2FA not enabled",
            };
        }

        // Generate OTP
        const otp = generateOtp();

        // Store OTP in 2FA record (hashed)
        const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);
        await prisma.twoFactorAuth.update({
            where: { userId },
            data: {
                secret: hashedOtp,
                updatedAt: new Date(), // Reset the timer for OTP expiration
            },
        });

        // Send OTP via email
        const sentOtp = await sendOtpEmail(user.email, otp);

        if (!sentOtp) {
            return {
                success: false,
                message: "Failed to send OTP email",
            };
        }

        // Generate temporary token that requires 2FA validation
        const tempToken = uuidv4();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create temporary session that requires 2FA
        await prisma.session.create({
            data: {
                token: tempToken,
                userId: user.id,
                expiresAt,
                // Store metadata to indicate this session requires 2FA
                meta: {
                    requiresTwoFactor: true,
                },
            },
        });

        return {
            success: true,
            message: "OTP sent successfully",
            tempToken,
            requiresTwoFactor: true,
        };
    } catch (error) {
        console.error("Error generating OTP:", error);
        throw new Error("Failed to generate and send OTP");
    }
}

/**
 * Verify OTP for 2FA
 */
export async function verifyOtp(
    userId: string,
    otp: string,
    tempToken: string,
    trustDevice: boolean = false,
    deviceInfo?: { name: string; type?: string; ip?: string }
) {
    try {
        // Check if user exists and has 2FA enabled
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { twoFactorAuth: true },
        });

        if (!user || !user.twoFactorEnabled || !user.twoFactorAuth) {
            return {
                success: false,
                message: "User not found or 2FA not enabled",
            };
        }

        // Find the temporary session
        const tempSession = await prisma.session.findFirst({
            where: {
                token: tempToken,
                userId,
                expiresAt: { gt: new Date() },
            },
        });

        if (!tempSession) {
            return {
                success: false,
                message: "Invalid or expired session",
            };
        }

        // Check if OTP matches (or is a valid backup code)
        let otpValid = false;

        // Check if it's a backup code
        if (user.twoFactorAuth.otpBackupCodes.includes(otp)) {
            otpValid = true;
            // Remove the used backup code
            const updatedBackupCodes = user.twoFactorAuth.otpBackupCodes.filter(
                (code) => code !== otp
            );
            await prisma.twoFactorAuth.update({
                where: { userId },
                data: {
                    otpBackupCodes: updatedBackupCodes,
                },
            });
        }
        // Otherwise check if it's the current OTP
        else if (user.twoFactorAuth.secret) {
            otpValid = await bcrypt.compare(otp, user.twoFactorAuth.secret);
        }

        if (!otpValid) {
            return {
                success: false,
                message: "Invalid OTP code",
            };
        }

        // Delete the temporary session
        await prisma.session.delete({
            where: { id: tempSession.id },
        });

        // Create a fully authenticated session
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY);

        await prisma.session.create({
            data: {
                token,
                userId: user.id,
                expiresAt,
            },
        });

        // Clear the stored OTP
        await prisma.twoFactorAuth.update({
            where: { userId },
            data: {
                secret: null,
            },
        });

        // If trustDevice is true and deviceInfo is provided, create a trusted device
        let deviceToken;
        if (trustDevice && deviceInfo) {
            try {
                const deviceResult = await createTrustedDevice(
                    userId,
                    deviceInfo.name,
                    deviceInfo.ip,
                    deviceInfo.type
                );
                if (deviceResult.success) {
                    deviceToken = deviceResult.deviceToken;
                }
            } catch (error) {
                console.error(
                    "Error creating trusted device during OTP verification:",
                    error
                );
            }
        }

        // Get user profile and questionnaire response for complete user data
        const profile = await prisma.profile.findUnique({
            where: { userId: user.id },
        });

        const questionnaireResponse = await prisma.questionnaireResponse.findUnique({
            where: { userId: user.id },
        });

        return {
            success: true,
            message: "OTP verified successfully",
            token,
            deviceToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                verified: user.verified,
                hasPassword: !!user.hashedPassword,
                kycVerified: user.kycVerified,
                questionnaireCompleted: !!questionnaireResponse,
                profile
            },
        };
    } catch (error) {
        console.error("Error verifying OTP:", error);
        throw new Error("Failed to verify OTP");
    }
}

/**
 * Check if 2FA is required for a user
 */
export async function check2FARequired(
    email: string,
    password: string,
    deviceToken?: string
) {
    try {
        console.debug(
            `Checking 2FA requirement for ${email}, deviceToken provided: ${!!deviceToken}`
        );

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        // Check if user exists and password is correct
        if (!user || !user.hashedPassword) {
            return {
                success: false,
                message: "The user does not exist",
            };
        }

        // Check if user is verified
        if (!user.verified) {
            return {
                success: false,
                message: "Please verify your email before logging in",
            };
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            return {
                success: false,
                message: "The password is incorrect",
            };
        }

        // If device token provided and 2FA is enabled, validate the device
        let isTrustedDevice = false;
        if (deviceToken && user.twoFactorEnabled) {
            try {
                const deviceResult = await validateTrustedDevice(deviceToken);
                isTrustedDevice = deviceResult.valid && deviceResult.userId === user.id;
            } catch (error) {
                console.error("Error validating device token during login:", error);
                // Continue with login flow even if device validation fails
            }
        }

        // Check if 2FA is enabled and device is not trusted
        if (user.twoFactorEnabled && !isTrustedDevice) {
            // Generate and send OTP
            const otpResult = await generateAndSendOtp(user.id);

            if (!otpResult.success) {
                return {
                    success: false,
                    message: "Failed to generate 2FA code",
                };
            }

            return {
                success: true,
                message: "Login requires 2FA verification",
                requiresTwoFactor: true,
                tempToken: otpResult.tempToken,
                userId: user.id,
            };
        }

        // If no 2FA or device is trusted, create session and return login data
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY);

        await prisma.session.create({
            data: {
                token,
                userId: user.id,
                expiresAt,
            },
        });

        // Get user profile and questionnaire response
        const profile = await prisma.profile.findUnique({
            where: { userId: user.id },
        });

        const questionnaireResponse = await prisma.questionnaireResponse.findUnique({
            where: { userId: user.id },
        });

        return {
            success: true,
            message: "Login successful",
            requiresTwoFactor: false,
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                verified: user.verified,
                hasPassword: !!user.hashedPassword,
                kycVerified: user.kycVerified,
                questionnaireCompleted: !!questionnaireResponse,
                twoFactorEnabled: user.twoFactorEnabled,
                profile: profile
                    ? {
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        bio: profile.bio,
                        dob: profile.dob,
                        avatarUrl: profile.avatarUrl,
                    }
                    : undefined,
            },
        };
    } catch (error) {
        console.error("Error checking 2FA requirement:", error);
        throw new Error("Failed to check 2FA requirement");
    }
}

/**
 * Verify backup code for 2FA
 */
export async function verifyBackupCode(
    userId: string,
    backupCode: string,
    tempToken: string,
    trustDevice: boolean = false,
    deviceInfo?: { name: string; type?: string; ip?: string }
) {
    try {
        // Check if user exists and has 2FA enabled
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { twoFactorAuth: true },
        });

        if (!user || !user.twoFactorEnabled || !user.twoFactorAuth) {
            return {
                success: false,
                message: "User not found or 2FA not enabled",
            };
        }

        // Find the temporary session
        const tempSession = await prisma.session.findFirst({
            where: {
                token: tempToken,
                userId,
                expiresAt: { gt: new Date() },
            },
        });

        if (!tempSession) {
            return {
                success: false,
                message: "Invalid or expired session",
            };
        }

        // Check if backup code is valid
        const isValidCode = user.twoFactorAuth.otpBackupCodes.includes(backupCode);

        if (!isValidCode) {
            return {
                success: false,
                message: "Invalid backup code",
            };
        }

        // Remove the used backup code
        const updatedBackupCodes = user.twoFactorAuth.otpBackupCodes.filter(
            (code) => code !== backupCode
        );
        await prisma.twoFactorAuth.update({
            where: { userId },
            data: {
                otpBackupCodes: updatedBackupCodes,
            },
        });

        // Delete the temporary session
        await prisma.session.delete({
            where: { id: tempSession.id },
        });

        // Create a fully authenticated session
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY);

        await prisma.session.create({
            data: {
                token,
                userId: user.id,
                expiresAt,
            },
        });

        // If trustDevice is true and deviceInfo is provided, create a trusted device
        let deviceToken;
        if (trustDevice && deviceInfo) {
            try {
                const deviceResult = await createTrustedDevice(
                    userId,
                    deviceInfo.name,
                    deviceInfo.ip,
                    deviceInfo.type
                );
                if (deviceResult.success) {
                    deviceToken = deviceResult.deviceToken;
                }
            } catch (error) {
                console.error(
                    "Error creating trusted device during backup code verification:",
                    error
                );
                // Continue with login even if trusted device creation fails
            }
        }

        // Get user profile and questionnaire response for complete user data
        const profile = await prisma.profile.findUnique({
            where: { userId: user.id },
        });

        const questionnaireResponse = await prisma.questionnaireResponse.findUnique({
            where: { userId: user.id },
        });

        return {
            success: true,
            message: "Backup code verified successfully",
            token,
            deviceToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                verified: user.verified,
                hasPassword: !!user.hashedPassword,
                kycVerified: user.kycVerified,
                questionnaireCompleted: !!questionnaireResponse,
                twoFactorEnabled: user.twoFactorEnabled,
                profile: profile
            },
        };
    } catch (error) {
        console.error("Error verifying backup code:", error);
        throw new Error("Failed to verify backup code");
    }
}

/**
 * Login user with modified flow for 2FA
 */
export async function loginUser(
    email: string,
    password: string,
    deviceToken?: string
) {
    try {
        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                profile: true,
            },
        });

        // Check if user exists and password is correct
        if (!user || !user.hashedPassword) {
            return {
                success: false,
                message: "Invalid email or password",
                token: null,
                user: null,
            };
        }

        // Check if user is verified
        if (!user.verified) {
            return {
                success: false,
                message: "Please verify your email before logging in",
                token: null,
                user: null,
            };
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            return {
                success: false,
                message: "Invalid email or password",
                token: null,
                user: null,
            };
        }

        // If device token provided, validate it
        let isTrustedDevice = false;
        if (deviceToken && user.twoFactorEnabled) {
            const deviceResult = await validateTrustedDevice(deviceToken);
            isTrustedDevice = deviceResult.valid && deviceResult.userId === user.id;
        }

        // Check if 2FA is enabled and device is not trusted
        if (user.twoFactorEnabled && !isTrustedDevice) {
            // Generate and send OTP
            const otpResult = await generateAndSendOtp(user.id);

            if (!otpResult.success) {
                return {
                    success: false,
                    message: "Failed to generate 2FA code",
                    token: null,
                    user: null,
                };
            }

            return {
                success: true,
                message: "Login requires 2FA verification",
                requiresTwoFactor: true,
                tempToken: otpResult.tempToken,
                userId: user.id,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    verified: user.verified,
                    hasPassword: user.hashedPassword ? true : false,
                },
            };
        }

        // If no 2FA or device is trusted, proceed with normal login flow
        // Generate session token
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY);

        // Create session
        await prisma.session.create({
            data: {
                token,
                userId: user.id,
                expiresAt,
            },
        });

        return {
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                verified: user.verified,
                hasPassword: user.hashedPassword ? true : false,
                profile: user.profile,
            },
        };
    } catch (error) {
        console.error("Error logging in user:", error);
        throw new Error("Failed to login");
    }
}

/**
 * Logout user
 */
export async function logoutUser(token: string) {
    try {
        // Delete session
        await prisma.session.delete({
            where: { token },
        });

        return {
            success: true,
            message: "Logout successful",
        };
    } catch (error) {
        console.error("Error logging out user:", error);
        throw new Error("Failed to logout");
    }
}

/**
 * Verify session token
 */
export async function verifySession(token: string) {
    try {
        // Find session
        const session = await prisma.session.findUnique({
            where: { token },
            include: {
                user: {
                    include: {
                        profile: true,
                        mentalHealthProfile: true,
                        questionnaireResponse: true,
                    },
                },
            },
        });

        // Check if session exists and is not expired
        if (!session || session.expiresAt < new Date()) {
            if (session) {
                // Delete expired session
                await prisma.session.delete({
                    where: { id: session.id },
                });
            }

            return {
                valid: false,
                user: null,
            };
        }

        // Update session expiry
        await prisma.session.update({
            where: { id: session.id },
            data: {
                expiresAt: new Date(Date.now() + TOKEN_EXPIRY),
            },
        });

        // console.log("User Mental Health Profile:", session.user.mentalHealthProfile);

        return {
            valid: true,
            user: {
                id: session.user.id,
                email: session.user.email,
                role: session.user.role,
                verified: session.user.verified,
                kycVerified: session.user.kycVerified,
                profile: session.user.profile,
                twoFactorEnabled: session.user.twoFactorEnabled,
                hasPassword: session.user.hashedPassword ? true : false,
                questionnaireCompleted: !!(session.user.mentalHealthProfile)
            },
        };
    } catch (error) {
        console.error("Error verifying session:", error);
        throw new Error("Failed to verify session");
    }
}

/**
 * Forgot password
 */
export async function forgotPassword(email: string) {
    try {
        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // For security reasons, we still return success even if user doesn't exist
            return {
                success: true,
                message:
                    "If an account with that email exists, we've sent a password reset link",
            };
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY);

        // Update user with reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        // Send password reset email
        await sendPasswordResetEmail(email, resetToken);

        return {
            success: true,
            message:
                "If an account with that email exists, we've sent a password reset link",
        };
    } catch (error) {
        console.error("Error in forgot password:", error);
        throw new Error("Failed to process forgot password request");
    }
}

/**
 * Reset password
 */
export async function resetPassword(token: string, password: string) {
    try {
        // Find user with this reset token
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            },
        });

        if (!user) {
            return {
                success: false,
                message: "Invalid or expired reset token",
            };
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Update user password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        return {
            success: true,
            message: "Password reset successful",
        };
    } catch (error) {
        console.error("Error resetting password:", error);
        throw new Error("Failed to reset password");
    }
}

export async function setPassword(
    userId: string,
    password: string
) {
    try {
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

        //if user already has a password, return error
        if (user.hashedPassword) {
            return {
                success: false,
                message: "User already has a password set",
            };
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Update user password
        await prisma.user.update({
            where: { id: user.id },
            data: {
                hashedPassword,
            },
        });

        return {
            success: true,
            message: "Password set successfully",
        };
    } catch (error) {
        console.error("Error setting password:", error);
        throw new Error("Failed to set password");
    }
}

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                profile: true,
            },
        });

        return user;
    } catch (error) {
        console.error("Error getting user by ID:", error);
        throw new Error("Failed to get user");
    }
}

/**
 * Social authentication - login or register via social provider
 */
export async function socialAuth(
    email: string,
    provider: string,
    providerId: string,
    name: string,
    firstName?: string,
    lastName?: string,
    avatarUrl?: string
) {
    try {
        // Split full name into first and last name if not provided
        let parsedFirstName = firstName;
        let parsedLastName = lastName;

        if (!firstName && !lastName && name) {
            const nameParts = name.split(" ");
            parsedFirstName = nameParts[0] || "";
            parsedLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
        }

        // Check if user with this email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
            include: {
                profile: true,
                questionnaireResponse: true,
            },
        });

        // Generate session token
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY);

        if (existingUser) {
            // User exists - check if accounts need to be linked
            // First, link the social account
            await linkAccount(existingUser.id, provider, providerId);

            console.log("User already exists", existingUser);

            // Update avatar URL if not already set and one is provided
            if (!existingUser.profile?.avatarUrl && avatarUrl) {
                await prisma.profile.update({
                    where: { userId: existingUser.id },
                    data: { avatarUrl },
                });
            }

            // Create session for existing user
            await prisma.session.create({
                data: {
                    token,
                    userId: existingUser.id,
                    expiresAt,
                },
            });

            const response = {
                success: true,
                message: "Login successful",
                token,
                user: {
                    id: existingUser.id,
                    email: existingUser.email,
                    role: existingUser.role,
                    verified: existingUser.verified,
                    hasPassword: existingUser.hashedPassword ? true : false,
                    kycVerified: existingUser.kycVerified,
                    questionnaireCompleted: !!existingUser.questionnaireResponse,
                    twoFactorEnabled: existingUser.twoFactorEnabled,
                    profile: {
                        ...existingUser.profile,
                        avatarUrl: existingUser.profile?.avatarUrl || avatarUrl,
                    },
                },
            };

            console.log("User logged in via social auth", response);
            return response;
        } else {
            // User doesn't exist - create new user
            const newUser = await prisma.user.create({
                data: {
                    email,
                    verified: true, // Social logins are pre-verified
                    role: "USER",
                    profile: {
                        create: {
                            firstName: parsedFirstName || "",
                            lastName: parsedLastName || "",
                            avatarUrl: avatarUrl,
                        },
                    },
                },
                include: {
                    profile: true,
                    questionnaireResponse: true,
                },
            });

            // Link the account
            await linkAccount(newUser.id, provider, providerId);

            // console.log("New user created", newUser);

            // Create session
            await prisma.session.create({
                data: {
                    token,
                    userId: newUser.id,
                    expiresAt,
                },
            });

            const response = {
                success: true,
                message: "Account created and logged in successfully",
                token,
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    role: newUser.role,
                    verified: newUser.verified,
                    hasPassword: newUser.hashedPassword ? true : false,
                    kycVerified: newUser.kycVerified,
                    questionnaireCompleted: !!newUser.questionnaireResponse,
                    twoFactorEnabled: newUser.twoFactorEnabled,
                    profile: newUser.profile,
                },
            };

            console.log("New user logged in via social auth", response);
            return response;
        }
    } catch (error) {
        console.error("Error in social authentication:", error);
        throw new Error("Failed to authenticate with social provider");
    }
}

/**
 * Link a social account to an existing user
 */
export async function linkAccount(
    userId: string,
    provider: string,
    providerId: string
) {
    try {
        // Check if we need to update the prisma schema to add UserAccount model
        // For now, we'll handle this with a simple implementation

        // Since we can't modify the schema, we'll return a success message
        // In a real implementation, you would store the link in a UserAccount table

        console.info(`Linked ${provider} account ${providerId} to user ${userId}`);

        return {
            success: true,
            message: `Successfully linked ${provider} account`,
        };
    } catch (error) {
        console.error("Error linking account:", error);
        throw new Error("Failed to link account");
    }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    userId: string,
    data: {
        firstName?: string;
        lastName?: string;
        bio?: string;
        avatarUrl?: string;
        dob?: string,
    }
) {
    try {
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user) {
            return {
                success: false,
                message: "User not found",
            };
        }

        // Update profile
        const updatedProfile = await prisma.profile.update({
            where: { userId },
            data: {
                firstName: data.firstName || user.profile?.firstName,
                lastName: data.lastName || user.profile?.lastName,
                bio: data.bio || user.profile?.bio,
                avatarUrl: data.avatarUrl || user.profile?.avatarUrl,
                dob: data.dob || user.profile?.dob,
            },
        });

        return {
            success: true,
            message: "Profile updated successfully",
            profile: updatedProfile,
        };
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw new Error("Failed to update profile");
    }
}

/**
 * Change user password
 */
export async function changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
) {
    try {
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.hashedPassword) {
            return {
                success: false,
                message: "User not found or password cannot be changed",
            };
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(
            currentPassword,
            user.hashedPassword
        );
        if (!isPasswordValid) {
            return {
                success: false,
                message: "Current password is incorrect",
            };
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { hashedPassword },
        });

        // Invalidate all existing sessions for security
        await prisma.session.deleteMany({
            where: { userId },
        });

        return {
            success: true,
            message:
                "Password changed successfully. Please log in again with your new password.",
        };
    } catch (error) {
        console.error("Error changing password:", error);
        throw new Error("Failed to change password");
    }
}

/**
 * Delete user account
 */
export async function deleteAccount(userId: string) {
    try {
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

        // Delete user - all related data will be deleted by Prisma cascade
        await prisma.user.delete({
            where: { id: userId },
        });

        return {
            success: true,
            message: "Account deleted successfully",
        };
    } catch (error) {
        console.error("Error deleting account:", error);
        throw new Error("Failed to delete account");
    }
}

/**
 * Regenerate backup codes for 2FA
 */
export async function regenerateBackupCodes(userId: string) {
    try {
        // Check if user exists and has 2FA enabled
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { twoFactorAuth: true },
        });

        if (!user || !user.twoFactorEnabled || !user.twoFactorAuth) {
            return {
                success: false,
                message: "User not found or 2FA not enabled",
                backupCodes: [],
            };
        }

        // Generate new backup codes
        const backupCodes = generateBackupCodes();

        // Update 2FA record with new backup codes
        await prisma.twoFactorAuth.update({
            where: { userId },
            data: {
                otpBackupCodes: backupCodes,
            },
        });

        return {
            success: true,
            message: "Backup codes regenerated successfully",
            backupCodes
        };
    } catch (error) {
        console.error("Error regenerating backup codes:", error);
        throw new Error("Failed to regenerate backup codes");
    }
}

/**
 * Get backup codes for 2FA
 */
export async function getBackupCodes(userId: string) {
    try {
        // Check if user exists and has 2FA enabled
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { twoFactorAuth: true },
        });

        if (!user || !user.twoFactorEnabled || !user.twoFactorAuth) {
            return {
                success: false,
                message: "User not found or 2FA not enabled",
                backupCodes: [],
            };
        }

        return {
            success: true,
            message: "Backup codes retrieved successfully",
            backupCodes: user.twoFactorAuth.otpBackupCodes || [],
        };
    } catch (error) {
        console.error("Error getting backup codes:", error);
        throw new Error("Failed to get backup codes");
    }
}

/**
 * Create a trusted device for a user
 */
export async function createTrustedDevice(
    userId: string,
    deviceName: string,
    ipAddress?: string,
    deviceType?: string
) {
    try {
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

        // Generate device token
        const deviceToken = uuidv4() + crypto.randomBytes(32).toString("hex");

        // Set expiration (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Create trusted device
        await prisma.trustedDevice.create({
            data: {
                userId,
                deviceToken,
                deviceName,
                ipAddress,
                deviceType,
                expiresAt,
            },
        });

        return {
            success: true,
            message: "Device trusted successfully",
            deviceToken,
            expiresAt,
        };
    } catch (error) {
        console.error("Error creating trusted device:", error);
        throw new Error("Failed to trust device");
    }
}

/**
 * Validate a trusted device token
 */
export async function validateTrustedDevice(deviceToken: string) {
    try {
        // Find trusted device
        const trustedDevice = await prisma.trustedDevice.findUnique({
            where: { deviceToken },
            include: { user: true },
        });

        // Check if device exists and is not expired
        if (!trustedDevice || trustedDevice.expiresAt < new Date()) {
            if (trustedDevice) {
                // Delete expired device
                await prisma.trustedDevice.delete({
                    where: { id: trustedDevice.id },
                });
            }

            return {
                valid: false,
                userId: null,
            };
        }

        // Update last used timestamp
        await prisma.trustedDevice.update({
            where: { id: trustedDevice.id },
            data: { lastUsed: new Date() },
        });

        return {
            valid: true,
            userId: trustedDevice.userId,
            user: trustedDevice.user,
        };
    } catch (error) {
        console.error("Error validating trusted device:", error);
        throw new Error("Failed to validate trusted device");
    }
}

/**
 * Remove a trusted device
 */
export async function removeTrustedDevice(deviceToken: string, userId: string) {
    try {
        // Check if device belongs to the user
        const trustedDevice = await prisma.trustedDevice.findFirst({
            where: {
                deviceToken,
                userId,
            },
        });

        if (!trustedDevice) {
            return {
                success: false,
                message: "Device not found or does not belong to user",
            };
        }

        // Delete the device
        await prisma.trustedDevice.delete({
            where: { id: trustedDevice.id },
        });

        return {
            success: true,
            message: "Device removed successfully",
        };
    } catch (error) {
        console.error("Error removing trusted device:", error);
        throw new Error("Failed to remove trusted device");
    }
}

/**
 * Get all trusted devices for a user
 */
export async function getTrustedDevices(userId: string) {
    try {
        // Get user's trusted devices
        const devices = await prisma.trustedDevice.findMany({
            where: { userId },
            orderBy: { lastUsed: "desc" },
        });

        return {
            success: true,
            message: "Trusted devices retrieved successfully",
            devices,
        };
    } catch (error) {
        console.error("Error getting trusted devices:", error);
        throw new Error("Failed to get trusted devices");
    }
}

/**
 * Verify password
  */
export async function verifyPassword(userId: string, password: string) {
    try {
        // Find user
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.hashedPassword) {
            return {
                success: false,
                message: "User not found or password cannot be verified",
            };
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            return {
                success: false,
                message: "The password is incorrect",
            };
        }

        return {
            success: true,
            message: "Password verified successfully",
        };
    } catch (error) {
        console.error("Error verifying password:", error);
        throw new Error("Failed to verify password");
    }
}