const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendVerificationEmail(
    email: string,
    token: string
): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/email/send-verification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, token }),
        });

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error sending verification email via API:', error);
        return false;
    }
}

export async function sendPasswordResetEmail(
    email: string,
    token: string
): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/email/send-password-reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, token }),
        });

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error sending password reset email via API:', error);
        return false;
    }
}

export async function sendOtpEmail(
    email: string,
    otp: string
): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/email/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, otp }),
        });

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error sending OTP email via API:', error);
        return false;
    }
}

// export async function sendMeetingInvitationEmail(
//   email: string,
//   meeting: any,
//   host: any
// ): Promise<boolean> {
//   try {
//     const response = await fetch(`${API_BASE_URL}/api/email/send-meeting-invitation`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ email, meeting, host }),
//     });

//     const data = await response.json();
//     return data.success;
//   } catch (error) {
//     console.error('Error sending meeting invitation email via API:', error);
//     return false;
//   }
// }
