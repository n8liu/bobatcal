import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

// Instantiate Prisma Client
const prisma = new PrismaClient();

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('Missing GOOGLE_CLIENT_ID environment variable');
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_SECRET environment variable');
}
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Missing NEXTAUTH_SECRET environment variable');
}

// Define and export the configuration options
export const authOptions: NextAuthOptions = {
  // @ts-expect-error // Adapter type error suppression
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Add other providers here if needed (e.g., GitHub, Email)
  ],
  session: {
    strategy: 'jwt', // Use JWT strategy to enable custom callbacks
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Optional: Add callbacks for customizing behavior (e.g., session, jwt)
  callbacks: {
    // Include user's role and ID in the JWT
    async jwt({ 
        token, 
        user, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        account, // Keep original name, disable eslint warning
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        profile, // Keep original name, disable eslint warning
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isNewUser // Keep original name, disable eslint warning
    }) { 
      // 1. Set user ID (sub) on initial sign-in
      if (user && !token.sub) { 
        token.sub = user.id;
      }

      // 2. If user ID exists, always fetch the latest role from DB
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true }
          });
          token.role = dbUser?.role || 'USER'; // Update role in token
        } catch (error) {
          console.error("Error fetching user role for JWT:", error);
          token.role = 'USER'; // Default role on error
        }
      }
      
      return token;
    },

    // Include user's role and ID in the session
    async session({ session, token }) {
      // token contains data from jwt callback (id, role)
      if (token && session.user) {
        session.user.id = token.sub as string; // Add id from token
        session.user.role = token.role as string; // Add role from token
      }
      return session;
    },
  },
  // Optional: Configure custom pages
  // pages: {
  //   signIn: '/auth/signin',
  //   signOut: '/auth/signout',
  //   error: '/auth/error', // Error code passed in query string as ?error=
  //   verifyRequest: '/auth/verify-request', // (used for email/passwordless sign in)
  //   newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out to disable)
  // }
};

// Use the exported options in the NextAuth handler
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
