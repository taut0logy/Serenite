import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/actions/email.actions';

//export const runtime = 'nodejs'; // Force Node.js runtime for nodemailer

export async function POST(request: NextRequest) {
    try {
        const { email, token } = await request.json();

        if (!email || !token) {
            return NextResponse.json(
                { success: false, message: 'Email and token are required' },
                { status: 400 }
            );
        }

        const result = await sendPasswordResetEmail(email, token);

        return NextResponse.json({
            success: result,
            message: result ? 'Email sent successfully' : 'Failed to send email',
        });
    } catch (error) {
        console.error('Error in send-password-reset API:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to send password reset email' },
            { status: 500 }
        );
    }
}
