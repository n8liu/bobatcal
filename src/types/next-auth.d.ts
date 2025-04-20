// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's id from the database. */
      id: string;
    } & DefaultSession["user"]; // Keep the default properties like name, email, image
  }
}

// Optional: If you also customize the JWT token
// declare module "next-auth/jwt" {
//   /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
//   interface JWT {
//     /** OpenID ID Token */
//     id?: string; // Example: adding id to the JWT
//   }
// }
