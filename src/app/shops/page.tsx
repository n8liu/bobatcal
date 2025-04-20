import prisma from '@/lib/prisma';
import { Shop } from '@prisma/client'; // Correct import for the model type
import Link from 'next/link'; // Import Link

// This page is a React Server Component, so we can fetch data directly
async function getShops(): Promise<Shop[]> { // Type the return promise
  const shops = await prisma.shop.findMany({
    orderBy: {
      name: 'asc', // Order shops alphabetically by name
    },
  });
  return shops;
}

export default async function ShopsPage() {
  const shops = await getShops();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Boba Shops</h1>
      {shops.length === 0 ? (
        <p className="text-gray-600">No shops have been added yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((shop: Shop) => ( // Type the shop parameter
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
      <div className="mt-8 flex justify-center">
        <Link
          href="/shops/add"
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-md"
        >
          Add New Shop
        </Link>
      </div>
    </div>
  );
}
