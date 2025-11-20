import { NextRequest, NextResponse } from 'next/server';
import { sendOtpEmail } from '@/actions/email.actions';

//export const runtime = 'nodejs'; // Force Node.js runtime for nodemailer

export async function POST(request: NextRequest) {
    try {
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return NextResponse.json(
                { success: false, message: 'Email and OTP are required' },
                { status: 400 }
            );
        }

        const result = await sendOtpEmail(email, otp);

        return NextResponse.json({
            success: result,
            message: result ? 'Email sent successfully' : 'Failed to send email',
        });
    } catch (error) {
        console.error('Error in send-otp API:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to send OTP email' },
            { status: 500 }
        );
    }
}
