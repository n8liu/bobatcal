'use client'; 

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image'; 

export default function Header() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-teal-600 hover:text-teal-700">
          Bobatcal
        </Link>
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="animate-pulse h-8 w-20 bg-gray-300 rounded"></div> 
          ) : session ? (
            <>
              {session.user?.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User profile picture'}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-gray-700 hidden sm:inline">
                {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn('google')} 
              className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600 text-sm"
            >
              Login with Google
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
