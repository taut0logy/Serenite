'use server';

import nodemailer from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';


// Create a transporter using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: parseInt(process.env.EMAIL_PORT || '587') === 465, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        // Do not fail on invalid certs (for development)
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000, // 10 seconds
    socketTimeout: 10000, // 10 seconds
});

/**
 * Verify email connection
 */
export async function verifyConnection(): Promise<boolean> {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('Email credentials not provided. Email service will not work.');
            return false;
        }
        
        await transporter.verify();
        return true;
    } catch (error) {
        console.error('Email service connection failed:', error);
        return false;
    }
}

// Interface for sender information
export interface SenderInfo {
    email: string;
    name?: string;
}

// Enhanced email options interface with optional sender
export interface EmailOptions {
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
    sender?: SenderInfo;
    replyTo?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Attachment[];
}

/**
 * Format the sender information into a proper "from" string
 * @param sender - The sender information object or undefined
 * @returns The formatted "from" string for the email
 */
function formatSender(sender?: SenderInfo): string {
    // If no custom sender is provided, use the default from environment variables
    if (!sender?.email) {
        const defaultEmail = process.env.EMAIL_FROM || '';
        const defaultName = process.env.EMAIL_FROM_NAME;

        return defaultName ? `"${defaultName}" <${defaultEmail}>` : defaultEmail;
    }

    // Format custom sender with name if provided
    return sender.name ? `"${sender.name}" <${sender.email}>` : sender.email;
}

/**
 * Send an email with optional custom sender
 * @param options - Email options including optional sender information
 * @returns Result object with success status and message ID or error
 */
export async function sendEmail(options: EmailOptions) {
    const { to, subject, text, html, sender, replyTo, cc, bcc, attachments } = options;

    try {
        const mailOptions = {
            from: formatSender(sender),
            replyTo: replyTo || undefined,
            to,
            cc,
            bcc,
            subject,
            text,
            html: html || text,
            attachments,
        };

        const info = await transporter.sendMail(mailOptions);
        console.info('Email sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };
    } catch (error) {
        console.error('Error sending email:', error);
        return {
            success: false,
            error,
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const verificationUrl = `${clientUrl}/auth/verify-email/${token}`;

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Serenite'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject: 'Verify Your Email Address',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Verify Your Email Address</h2>
                <p>Thank you for registering! Please click the button below to verify your email address:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                        Verify Email
                    </a>
                </div>
                <p>If you didn't request this email, you can safely ignore it.</p>
                <p>The link will expire in 24 hours.</p>
                <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
                <p>${verificationUrl}</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetUrl = `${clientUrl}/auth/reset-password/${token}`;

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Serenite'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject: 'Reset Your Password',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Reset Your Password</h2>
                <p>You've requested to reset your password. Please click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                        Reset Password
                    </a>
                </div>
                <p>If you didn't request this email, you can safely ignore it.</p>
                <p>The link will expire in 24 hours.</p>
                <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
                <p>${resetUrl}</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return false;
    }
}

/**
 * Send meeting invitation email
 */
export async function sendMeetingInvitationEmail(to: string, meeting, host): Promise<boolean> {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const meetingUrl = `${clientUrl}/meeting/${meeting.id}`;
    
    const startTime = new Date(meeting.startTime).toLocaleString();
    
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Serenite'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject: `Meeting Invitation: ${meeting.title}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Meeting Invitation</h2>
                <p>You've been invited to join a meeting.</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">${meeting.title}</h3>
                    <p><strong>Host:</strong> ${host.profile.firstName} ${host.profile.lastName}</p>
                    <p><strong>Time:</strong> ${startTime}</p>
                    <p><strong>Description:</strong> ${meeting.description || 'No description provided'}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${meetingUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                        Join Meeting
                    </a>
                </div>
                
                <p>You can join the meeting by clicking the button above or copying the following link into your browser:</p>
                <p>${meetingUrl}</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending meeting invitation email:', error);
        return false;
    }
}

/**
 * Send OTP email for two-factor authentication
 */
export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Serenite'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject: 'Your Two-Factor Authentication Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Two-Factor Authentication Code</h2>
                <p>Your security is important to us. Use the following code to complete your login:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 4px; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
                        ${otp}
                    </div>
                </div>
                
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't try to login, please secure your account by changing your password immediately.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return false;
    }
}