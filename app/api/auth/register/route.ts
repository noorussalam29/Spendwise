import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { registerSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Server-side Zod validation check
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;
    const normalizedEmail = email.toLowerCase();

    await dbConnect();

    // Validate email uniqueness
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return NextResponse.json(
        { message: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Hash the password securely
    const hashedPassword = await bcrypt.hash(password, 12);

    // Write user to database with default settings
    await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      payday: 1, // Default payday is the 1st of the month
      currentStreak: 0,
      lastLoggedDate: null,
    });

    return NextResponse.json(
      { message: 'User registered successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration route error:', error);
    return NextResponse.json(
      { message: 'Internal server error occurred' },
      { status: 500 }
    );
  }
}
