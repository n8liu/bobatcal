import prisma from '@/lib/prisma';
import Link from 'next/link'; // Import Link
// Import session utilities
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Define local interface matching needed fields
interface SimpleShop {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  zipCode: string | null;
}

// This page is a React Server Component, so we can fetch data directly
async function getShops(): Promise<SimpleShop[]> { // Update return type
  const shops = await prisma.shop.findMany({
    orderBy: {
      name: 'asc', // Order shops alphabetically by name
    },
    // Select only the fields needed for SimpleShop
    select: {
        id: true,
        name: true,
        address: true,
        city: true,
        zipCode: true,
    }
  });
  return shops;
}

export default async function ShopsPage() {
  const shops = await getShops();
  const session = await getServerSession(authOptions); // Get session on server

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Boba Shops</h1>
      {shops.length === 0 ? (
        <p className="text-gray-600">No shops have been added yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((shop: SimpleShop) => ( // Update type annotation
            <div key={shop.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-2 text-teal-700 hover:text-teal-900 transition-colors">
                <Link href={`/shops/${shop.id}`}>
                  {shop.name}
                </Link>
              </h2>
              <p className="text-gray-600 mb-1">{shop.address}</p>
              {shop.city && shop.zipCode && (
                <p className="text-gray-500 text-sm">{`${shop.city}, ${shop.zipCode}`}</p>
              )}
              {/* TODO: Add average rating display */}
            </div>
          ))}
        </div>
      )}
      {session?.user?.role === 'DRINK_ADMIN' && (
        <div className="mt-8 flex justify-center">
          <Link
            href="/shops/add"
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-md"
          >
            Add New Shop
          </Link>
        </div>
      )}
    </div>
  );
}
