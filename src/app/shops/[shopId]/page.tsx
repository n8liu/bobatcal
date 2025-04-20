import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Shop, Drink } from '@prisma/client'; // Correct import

interface ShopDetailPageProps {
  params: {
    shopId: string;
  };
}

// Fetch data for a specific shop and its drinks
async function getShopDetails(shopId: string): Promise<(Shop & { drinks: Drink[] }) | null> {
  try {
    const shopWithDrinks = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
      include: {
        drinks: { // Include the related drinks
          orderBy: {
            name: 'asc',
          },
        },
      },
    });
    console.log(`[getShopDetails] Fetched data for shop ID ${shopId}:`, JSON.stringify(shopWithDrinks, null, 2));
    return shopWithDrinks;
  } catch (error) {
    console.error(`Error fetching shop details for ID ${shopId}:`, error);
    // Handle potential errors like invalid ID format if needed
    return null;
  }
}

// React Server Component for the shop detail page
export default async function ShopDetailPage({ params }: ShopDetailPageProps) {
  const { shopId } = params;
  const shop = await getShopDetails(shopId);

  // If shop not found, display a 404 page
  if (!shop) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Shop Information */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-3 text-teal-800">{shop.name}</h1>
        <p className="text-gray-700 mb-1">{shop.address}</p>
        {shop.city && shop.zipCode && (
          <p className="text-gray-600 text-sm mb-3">{`${shop.city}, ${shop.zipCode}`}</p>
        )}
        {shop.phone && <p className="text-gray-600 text-sm mb-1">Phone: {shop.phone}</p>}
        {shop.hours && <p className="text-gray-600 text-sm">Hours: {shop.hours}</p>}
        {/* TODO: Add edit shop link/button? */} 
      </div>

      {/* Drink Menu */}
      <h2 className="text-2xl font-semibold mb-4 text-teal-700">Menu</h2>
      {shop.drinks.length === 0 ? (
        <p className="text-gray-600 bg-gray-50 p-4 rounded-md">No drinks have been added for this shop yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shop.drinks.map((drink: Drink) => ( // Add type annotation
            <div key={drink.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
              <h3 className="text-lg font-medium text-gray-800">
                {/* TODO: Link to drink detail/rating page? */}
                {drink.name}
              </h3>
              {/* TODO: Display average rating? */} 
            </div>
          ))}
        </div>
      )}

      {/* TODO: Add button/link to add a new drink to this shop */}

      {/* Back Link */}
      <div className="mt-8">
        <Link href="/shops" className="text-teal-600 hover:text-teal-800 hover:underline">
          &larr; Back to all shops
        </Link>
      </div>
    </div>
  );
}
