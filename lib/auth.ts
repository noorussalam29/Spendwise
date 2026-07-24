import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from './db';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password');
        }

        await dbConnect();

        // Find user by email (case-insensitive for safety)
        const user = await User.findOne({ email: credentials.email.toLowerCase() });

        if (!user) {
          throw new Error('No user found with this email');
        }

        // Compare password hashes
        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Incorrect password');
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          payday: user.payday,
          currentStreak: user.currentStreak,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.payday = (user as any).payday;
        token.currentStreak = (user as any).currentStreak;
      }

      // Let the client update JWT state programmatically (useful for streak changes or payday settings)
      if (trigger === 'update' && session) {
        if (session.currentStreak !== undefined) token.currentStreak = session.currentStreak;
        if (session.payday !== undefined) token.payday = session.payday;
        if (session.name !== undefined) token.name = session.name;
      }

      // Re-fetch user data from database on token refresh to get latest values
      if (token.id && !user) {
        try {
          await dbConnect();
          const dbUser = await User.findById(token.id);
          if (dbUser) {
            token.payday = dbUser.payday;
            token.currentStreak = dbUser.currentStreak;
            token.name = dbUser.name;
          }
        } catch (error) {
          console.error('Error fetching user data in JWT callback:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).payday = token.payday;
        (session.user as any).currentStreak = token.currentStreak;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    newUser: '/register',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
