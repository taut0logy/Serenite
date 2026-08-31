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
import { setClaimOverride } from "@/lib/set-claim-override";

// Constants
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_OTP_ATTEMPTS = 5;

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

        // Generate verification token with 24h expiry
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpiry = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                hashedPassword,
                verificationToken,
                verificationTokenExpiry,
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

        // Generate verification token with 24h expiry
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpiry = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS);

        // Update user with new verification token + expiry
        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationToken,
                verificationTokenExpiry,
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

        // Check if token has expired
        if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
            return {
                success: false,
                message: "Verification link has expired. Please request a new one.",
            };
        }

        // Update user to verified
        await prisma.user.update({
            where: { id: user.id },
            data: {
                verified: true,
                verificationToken: null,
                verificationTokenExpiry: null,
            },
        });

        // Best-effort: only helps if the user already has an active session
        // (verifying via a link opened in the same logged-in browser).
        await setClaimOverride({ email_verified: true }).catch(() => {});

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
 * Generate a cryptographically secure 6-digit OTP code
 */
function generateOtp(): string {
    // crypto.randomInt is CSPRNG — safe for auth codes
    return crypto.randomInt(100000, 1000000).toString();
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
        // Generate backup codes (plaintext returned once to user; hashed before storage)
        const plainCodes = generateBackupCodes();
        const hashedCodes = await Promise.all(
            plainCodes.map((c) => bcrypt.hash(c, SALT_ROUNDS))
        );

        // Create or update 2FA record with hashed backup codes
        if (user.twoFactorAuth) {
            await prisma.twoFactorAuth.update({
                where: { userId },
                data: {
                    otpBackupCodes: hashedCodes,
                },
            });
        } else {
            await prisma.twoFactorAuth.create({
                data: {
                    userId,
                    otpBackupCodes: hashedCodes,
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
            backupCodes: plainCodes, // Return PLAINTEXT codes once — user must save these
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
                otpAttempts: 0,
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

        // Check OTP attempt limit on this temp session
        if ((tempSession.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
            await prisma.session.delete({ where: { id: tempSession.id } });
            return {
                success: false,
                message: "Too many incorrect attempts. Please log in again.",
            };
        }

        // Check if OTP matches (or is a valid backup code)
        let otpValid = false;

        // Check if it's a backup code (hash-compare each stored hash)
        for (const storedHash of user.twoFactorAuth.otpBackupCodes) {
            if (await bcrypt.compare(otp, storedHash)) {
                otpValid = true;
                // Remove the used backup code
                const updatedBackupCodes = user.twoFactorAuth.otpBackupCodes.filter(
                    (h) => h !== storedHash
                );
                await prisma.twoFactorAuth.update({
                    where: { userId },
                    data: { otpBackupCodes: updatedBackupCodes },
                });
                break;
            }
        }
        // Otherwise check if it's the current OTP
        if (!otpValid && user.twoFactorAuth.secret) {
            otpValid = await bcrypt.compare(otp, user.twoFactorAuth.secret);
        }

        if (!otpValid) {
            // Increment OTP attempt counter on the temp session
            await prisma.session.update({
                where: { id: tempSession.id },
                data: { otpAttempts: { increment: 1 } },
            });
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

        const completedAssessment = await prisma.assessment.findFirst({
            where: { userId: user.id, isComplete: true },
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
                questionnaireCompleted: !!completedAssessment,
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

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            return {
                success: false,
                message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
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
            // Increment failure counter; lock if threshold exceeded
            const newCount = (user.failedLoginAttempts ?? 0) + 1;
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: newCount,
                    lockedUntil: newCount >= MAX_FAILED_ATTEMPTS
                        ? new Date(Date.now() + LOCKOUT_DURATION_MS)
                        : undefined,
                },
            });
            return {
                success: false,
                message: "The password is incorrect",
            };
        }

        // Successful auth — reset lockout counter
        if (user.failedLoginAttempts > 0) {
            await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedUntil: null },
            });
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

        const completedAssessment = await prisma.assessment.findFirst({
            where: { userId: user.id, isComplete: true },
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
                questionnaireCompleted: !!completedAssessment,
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

        // Check if backup code is valid (hash-compare each stored bcrypt hash)
        let isValidCode = false;
        let matchedHash: string | undefined;
        for (const storedHash of user.twoFactorAuth.otpBackupCodes) {
            if (await bcrypt.compare(backupCode, storedHash)) {
                isValidCode = true;
                matchedHash = storedHash;
                break;
            }
        }

        if (!isValidCode) {
            return {
                success: false,
                message: "Invalid backup code",
            };
        }

        // Remove the used backup code
        const updatedBackupCodes = user.twoFactorAuth.otpBackupCodes.filter(
            (h) => h !== matchedHash
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

        const completedAssessment = await prisma.assessment.findFirst({
            where: { userId: user.id, isComplete: true },
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
                questionnaireCompleted: !!completedAssessment,
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

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            return {
                success: false,
                message: `Account locked. Try again in ${minutesLeft} minute(s).`,
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
            const newCount = (user.failedLoginAttempts ?? 0) + 1;
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: newCount,
                    lockedUntil: newCount >= MAX_FAILED_ATTEMPTS
                        ? new Date(Date.now() + LOCKOUT_DURATION_MS)
                        : undefined,
                },
            });
            return {
                success: false,
                message: "Invalid email or password",
                token: null,
                user: null,
            };
        }

        // Successful auth — reset lockout counter
        if (user.failedLoginAttempts > 0) {
            await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedUntil: null },
            });
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
                        assessments: {
                            where: { isComplete: true },
                            take: 1,
                        },
                    },
                },
            },
        });

        // Check if session exists and is not expired
        if (!session) {
            console.error(`❌ [verifySession] Session not found for token: ${token.substring(0, 8)}...`);
            return { valid: false, user: null };
        }

        if (session.expiresAt < new Date()) {
            console.warn(`❌ [verifySession] Session expired at ${session.expiresAt.toISOString()}. Current time: ${new Date().toISOString()}`);
            // Delete expired session (use deleteMany to avoid race condition)
            await prisma.session.deleteMany({
                where: { id: session.id },
            });

            return {
                valid: false,
                user: null,
            };
        }

        // Update session expiry (wrap in try-catch for race conditions)
        try {
            await prisma.session.update({
                where: { id: session.id },
                data: {
                    expiresAt: new Date(Date.now() + TOKEN_EXPIRY),
                },
            });
        } catch (error) {
            // Session may have been deleted by another request, return invalid
            console.warn("Session update failed, may have been deleted:", error);
            return {
                valid: false,
                user: null,
            };
        }

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
                questionnaireCompleted: session.user.assessments.length > 0
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

        await setClaimOverride({ hasPassword: true });

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
 * Social authentication - login or register via social provider.
 *
 * Lookup order:
 *   1. By (provider, providerId) in SocialAccount table — most reliable.
 *   2. By email — handles first-time OAuth login for existing email-registered users.
 * On each login the SocialAccount row is upserted to stay consistent.
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
        // Parse name into first/last if not split already
        let parsedFirstName = firstName;
        let parsedLastName = lastName;
        if (!firstName && !lastName && name) {
            const parts = name.split(" ");
            parsedFirstName = parts[0] || "";
            parsedLastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
        }

        const token = uuidv4();
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY);

        // 1. Try looking up by (provider, providerId) — prevents email collisions
        const socialAccount = await prisma.socialAccount.findUnique({
            where: { provider_providerId: { provider, providerId } },
            include: {
                user: {
                    include: {
                        profile: true,
                        assessments: { where: { isComplete: true }, take: 1 },
                    },
                },
            },
        });

        if (socialAccount) {
            // Known social account — create session and return
            const user = socialAccount.user;

            // Backfill avatar if missing
            if (!user.profile?.avatarUrl && avatarUrl) {
                await prisma.profile.update({ where: { userId: user.id }, data: { avatarUrl } });
            }

            await prisma.session.create({ data: { token, userId: user.id, expiresAt } });

            return {
                success: true,
                message: "Login successful",
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    verified: user.verified,
                    hasPassword: !!user.hashedPassword,
                    kycVerified: user.kycVerified,
                    questionnaireCompleted: user.assessments.length > 0,
                    twoFactorEnabled: user.twoFactorEnabled,
                    profile: { ...user.profile, avatarUrl: user.profile?.avatarUrl || avatarUrl },
                },
            };
        }

        // 2. Check by email — existing user signing in with a new provider for the first time
        const existingUser = await prisma.user.findUnique({
            where: { email },
            include: {
                profile: true,
                assessments: { where: { isComplete: true }, take: 1 },
            },
        });

        if (existingUser) {
            // Link this new social account to the existing user
            await linkAccount(existingUser.id, provider, providerId);

            if (!existingUser.profile?.avatarUrl && avatarUrl) {
                await prisma.profile.update({ where: { userId: existingUser.id }, data: { avatarUrl } });
            }

            await prisma.session.create({ data: { token, userId: existingUser.id, expiresAt } });

            return {
                success: true,
                message: "Login successful",
                token,
                user: {
                    id: existingUser.id,
                    email: existingUser.email,
                    role: existingUser.role,
                    verified: existingUser.verified,
                    hasPassword: !!existingUser.hashedPassword,
                    kycVerified: existingUser.kycVerified,
                    questionnaireCompleted: existingUser.assessments.length > 0,
                    twoFactorEnabled: existingUser.twoFactorEnabled,
                    profile: { ...existingUser.profile, avatarUrl: existingUser.profile?.avatarUrl || avatarUrl },
                },
            };
        }

        // 3. Brand new user — create account + link social provider
        const newUser = await prisma.user.create({
            data: {
                email,
                verified: true, // Social logins are pre-verified by the provider
                profile: {
                    create: {
                        firstName: parsedFirstName || "",
                        lastName: parsedLastName || "",
                        avatarUrl,
                    },
                },
            },
            include: {
                profile: true,
                assessments: { where: { isComplete: true }, take: 1 },
            },
        });

        await linkAccount(newUser.id, provider, providerId);
        await prisma.session.create({ data: { token, userId: newUser.id, expiresAt } });

        return {
            success: true,
            message: "Account created and logged in successfully",
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role,
                verified: newUser.verified,
                hasPassword: !!newUser.hashedPassword,
                kycVerified: newUser.kycVerified,
                questionnaireCompleted: false,
                twoFactorEnabled: newUser.twoFactorEnabled,
                profile: newUser.profile,
            },
        };
    } catch (error) {
        console.error("Error in social authentication:", error);
        throw new Error("Failed to authenticate with social provider");
    }
}

/**
 * Link a social provider account to an existing user.
 * Uses upsert to ensure idempotency (safe to call on every OAuth login).
 */
export async function linkAccount(
    userId: string,
    provider: string,
    providerId: string
) {
    try {
        await prisma.socialAccount.upsert({
            where: { provider_providerId: { provider, providerId } },
            create: { userId, provider, providerId },
            update: { userId }, // Re-link if it was previously linked to another account
        });

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
 * Get all social accounts linked to a user.
 */
export async function getSocialAccounts(userId: string) {
    try {
        const accounts = await prisma.socialAccount.findMany({
            where: { userId },
            select: { id: true, provider: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        return { success: true, accounts };
    } catch (error) {
        console.error("Error getting social accounts:", error);
        throw new Error("Failed to get social accounts");
    }
}

/**
 * Unlink a social provider from a user.
 * Guard: cannot unlink if it's the only auth method (no password and only 1 social account).
 */
export async function unlinkSocialAccount(userId: string, provider: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { socialAccounts: true },
        });

        if (!user) return { success: false, message: "User not found" };

        // Safety guard: at least one auth method must remain
        if (!user.hashedPassword && user.socialAccounts.length <= 1) {
            return {
                success: false,
                message: "Cannot remove your only authentication method. Set a password first.",
            };
        }

        await prisma.socialAccount.deleteMany({
            where: { userId, provider },
        });

        return { success: true, message: `${provider} account unlinked successfully` };
    } catch (error) {
        console.error("Error unlinking social account:", error);
        throw new Error("Failed to unlink social account");
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
 * Change password with re-encryption of questionnaire responses.
 * The re-encryption happens client-side and the new encrypted data is passed to this function.
 * This ensures the server never sees the raw questionnaire responses.
 * 
 * @param userId - User ID
 * @param currentPassword - Current password for verification
 * @param newPassword - New password
 * @param reencryptedData - Re-encrypted questionnaire responses (Base64)
 * @param newIv - New IV for the re-encrypted data (Base64)
 * @param newSalt - New salt for the re-encrypted data (Base64)
 */
export async function changePasswordWithReencryption(
    userId: string,
    currentPassword: string,
    newPassword: string,
    reencryptedData?: string,
    newIv?: string,
    newSalt?: string
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

        // Use transaction to update both password and re-encrypted data atomically
        await prisma.$transaction(async (tx) => {
            // Update password
            await tx.user.update({
                where: { id: userId },
                data: { hashedPassword },
            });

            // Update re-encrypted questionnaire responses if provided
            if (reencryptedData && newIv && newSalt) {
                const encryptedBuffer = Buffer.from(reencryptedData, "base64");
                const ivBuffer = Buffer.from(newIv, "base64");
                const saltBuffer = Buffer.from(newSalt, "base64");

                // Update the latest incomplete questionnaire response
                const latestResponse = await tx.assessment.findFirst({
                    where: { userId, isComplete: false },
                    orderBy: { createdAt: 'desc' },
                });

                if (latestResponse) {
                    await tx.assessment.update({
                        where: { id: latestResponse.id },
                        data: {
                            encryptedData: encryptedBuffer,
                            iv: ivBuffer,
                            salt: saltBuffer,
                            updatedAt: new Date(),
                        },
                    });
                }
            }

            // Invalidate all existing sessions for security
            await tx.session.deleteMany({
                where: { userId },
            });
        });

        return {
            success: true,
            message:
                "Password changed successfully. Please log in again with your new password.",
        };
    } catch (error) {
        console.error("Error changing password with re-encryption:", error);
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
 * Verify password — used for confirm-password dialogs and questionnaire unlock.
 * Shares the same lockout counter as login to prevent brute-force via the UI.
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

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            return {
                success: false,
                message: `Account locked. Try again in ${minutesLeft} minute(s).`,
            };
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            // Share lockout counter with login
            const newCount = (user.failedLoginAttempts ?? 0) + 1;
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: newCount,
                    lockedUntil: newCount >= MAX_FAILED_ATTEMPTS
                        ? new Date(Date.now() + LOCKOUT_DURATION_MS)
                        : undefined,
                },
            });
            return {
                success: false,
                message: "The password is incorrect",
            };
        }

        // Reset lockout counter on success
        if (user.failedLoginAttempts > 0) {
            await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedUntil: null },
            });
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