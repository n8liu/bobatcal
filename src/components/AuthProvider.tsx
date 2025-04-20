'use client'; // This directive marks this as a Client Component

import { SessionProvider } from 'next-auth/react';
import React from 'react';

interface AuthProviderProps {
  children: React.ReactNode;
  // The session prop is optional, NextAuth automatically fetches it
  // session?: any;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
