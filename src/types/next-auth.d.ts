n// src/types/next-auth.d.ts
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's database id. */
      id: string;
      /** The user's role. */
      role: string; 
    } & DefaultSession['user']; // Keep existing properties like name, email, image
  }

  /** The OAuth profile returned from your provider */
  interface User extends DefaultUser {
    /** The user's role. */
    role: string;
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** OpenID ID Token */
    idToken?: string;
    /** User ID */
    sub?: string; // Ensure sub is string (user id)
    /** User Role */
    role?: string;
  }
}
