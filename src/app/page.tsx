// import Image from "next/image"; // Removed unused import
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-teal-800">
        Welcome to Bobatcal!
      </h1>
      <p className="text-lg text-gray-700 mb-8 text-center">
        Find and rate your favorite boba drinks and shops.
      </p>
      <div className="flex justify-center">
        <Link
          href="/shops"
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-md"
        >
          Browse Boba Shops
        </Link>
      </div>
    </div>
  );
}
