import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { settingsSchema } from '@/lib/validations';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    // Validate input
    const validationResult = settingsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error.issues[0].message }, { status: 400 });
    }

    const { name, payday, monthlyBudget, currentPassword, newPassword } = validationResult.data;

    await dbConnect();

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
    }

    // Update name if provided
    if (name !== undefined) {
      user.name = name;
    }

    // Update payday if provided
    if (payday !== undefined) {
      user.payday = payday;
    }

    await user.save();

    return NextResponse.json({ 
      message: 'Settings updated successfully',
      user: {
        name: user.name,
        email: user.email,
        payday: user.payday,
        monthlyBudget: user.monthlyBudget,
      }
    });
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
