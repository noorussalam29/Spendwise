import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { isOTPExpired } from '@/lib/otp';
import { verifyOTPSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = verifyOTPSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error.issues[0].message }, { status: 400 });
    }

    const { email, otp } = validationResult.data;

    await dbConnect();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    // Check if OTP exists
    if (!user.resetOTP) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    // Check if OTP is expired
    if (isOTPExpired(user.resetOTPExpiry)) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // Verify OTP
    console.log(`🔍 OTP Verification Debug:`);
    console.log(`  - Email: ${email}`);
    console.log(`  - Received OTP: "${otp}"`);
    console.log(`  - Stored OTP: "${user.resetOTP}"`);
    console.log(`  - OTP Match: ${user.resetOTP === otp}`);
    console.log(`  - Expiry: ${user.resetOTPExpiry}`);
    console.log(`  - Expired: ${isOTPExpired(user.resetOTPExpiry)}`);
    
    if (user.resetOTP !== otp) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // OTP is valid, return success
    return NextResponse.json({ 
      message: 'Verification code verified successfully',
      verified: true
    }, { status: 200 });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
