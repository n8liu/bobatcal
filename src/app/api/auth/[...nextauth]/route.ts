import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/prisma'; // Import our Prisma client instance

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('Missing GOOGLE_CLIENT_ID environment variable');
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_SECRET environment variable');
}
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Missing NEXTAUTH_SECRET environment variable');
}

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Add other providers here if needed (e.g., GitHub, Email)
  ],
  session: {
    strategy: 'database', // Use database sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Optional: Add callbacks for customizing behavior (e.g., session, jwt)
  // callbacks: {
  //   async session({ session, user }) {
  //     // Send properties to the client, like an access_token and user id from a provider.
  //     session.user.id = user.id;
  //     return session;
  //   }
  // },
  // Optional: Configure custom pages
  // pages: {
  //   signIn: '/auth/signin',
  //   signOut: '/auth/signout',
  //   error: '/auth/error', // Error code passed in query string as ?error=
  //   verifyRequest: '/auth/verify-request', // (used for email/passwordless sign in)
  //   newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out to disable)
  // }
});

export { handler as GET, handler as POST };
