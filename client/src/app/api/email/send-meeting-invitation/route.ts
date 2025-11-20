import { NextRequest, NextResponse } from 'next/server';
import { sendMeetingInvitationEmail } from '@/actions/email.actions';

//export const runtime = 'nodejs'; // Force Node.js runtime for nodemailer

export async function POST(request: NextRequest) {
    try {
        const { email, meeting, host } = await request.json();

        if (!email || !meeting || !host) {
            return NextResponse.json(
                { success: false, message: 'Email, meeting, and host are required' },
                { status: 400 }
            );
        }

        const result = await sendMeetingInvitationEmail(email, meeting, host);

        return NextResponse.json({
            success: result,
            message: result ? 'Email sent successfully' : 'Failed to send email',
        });
    } catch (error) {
        console.error('Error in send-meeting-invitation API:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to send meeting invitation email' },
            { status: 500 }
        );
    }
}
