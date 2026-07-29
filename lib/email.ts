import nodemailer from 'nodemailer';

// Create transporter using Gmail
const createTransporter = () => {
  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Gmail credentials not configured. Email sending will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email transporter not configured. OTP for development:', otp);
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.GMAIL_EMAIL,
      to: email,
      subject: 'Spendwise - Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Spendwise</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Secure Password Reset</p>
          </div>
          <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 10px 10px; color: #e2e8f0;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">You requested a password reset for your Spendwise account.</p>
            <p style="margin: 0 0 20px 0; font-size: 16px;">Your verification code is:</p>
            <div style="background: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 5px;">${otp}</span>
            </div>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #94a3b8;">This code will expire in 10 minutes.</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8;">If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">This is an automated email from Spendwise. Please do not reply.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    // Fallback: log OTP for development
    console.log('OTP for development (email failed):', otp);
    return false;
  }
}
