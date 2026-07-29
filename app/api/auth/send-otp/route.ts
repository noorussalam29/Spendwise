import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { generateOTP, generateOTPExpiry, maskEmail } from '@/lib/otp';
import { sendOTPSchema } from '@/lib/validations';
import { sendOTPEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const validationResult = sendOTPSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error.issues[0].message }, { status: 400 });
    }

    const { email } = validationResult.data;
    const cleanEmail = email.toLowerCase().trim();

    await dbConnect();

    // Find the exact user document
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return NextResponse.json({ 
        message: 'If an account exists with this email, a verification code has been sent.',
        maskedEmail: maskEmail(email)
      }, { status: 200 });
    }

    const otp = String(generateOTP());
    const otpExpiry = generateOTPExpiry(10);

    console.log(`👉 SAVING OTP FOR ${cleanEmail}:`, otp);

    // Assign properties directly to the Mongoose document instance
    user.resetOTP = otp;
    user.resetOTPExpiry = otpExpiry;
    
    // Force Mongoose to mark these fields as modified and save
    user.markModified('resetOTP');
    user.markModified('resetOTPExpiry');
    await user.save();

    const emailSent = await sendOTPEmail(email, otp);

    return NextResponse.json({ 
      message: 'If an account exists with this email, a verification code has been sent.',
      maskedEmail: maskEmail(email),
      devOTP: (!emailSent && process.env.NODE_ENV === 'development') ? otp : undefined
    }, { status: 200 });

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}