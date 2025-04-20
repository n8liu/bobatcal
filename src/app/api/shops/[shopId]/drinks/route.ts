// src/app/api/shops/[shopId]/drinks/route.ts
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next'; // Import getServerSession
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Import authOptions

const prisma = new PrismaClient();

// Define the expected shape of the request body
const createDrinkSchema = z.object({
  name: z.string().min(1, "Drink name cannot be empty"),
  // Add other optional fields like description, price if needed
  // description: z.string().optional(),
  // price: z.number().positive().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { shopId: string } }
) {
  const shopId = params.shopId;

  // === Authorization Check ===
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'DRINK_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ==========================

  // 1. Validate Shop ID exists
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }
  } catch (error) {
    console.error("Error finding shop:", error);
    return NextResponse.json({ error: 'Failed to verify shop' }, { status: 500 });
  }

  // 2. Parse and validate request body
  let validatedData;
  try {
    const body = await request.json();
    validatedData = createDrinkSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error("Error parsing request body:", error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 3. Create the drink in the database
  try {
    const newDrink = await prisma.drink.create({
      data: {
        name: validatedData.name,
        // description: validatedData.description, // Uncomment if added
        // price: validatedData.price,         // Uncomment if added
        shopId: shopId, // Link the drink to the specific shop
      },
    });
    return NextResponse.json(newDrink, { status: 201 }); // 201 Created
  } catch (error) {
    console.error('Failed to create drink:', error);
    return NextResponse.json({ error: 'Failed to create drink' }, { status: 500 });
  }
}

// Add GET handler below

export async function GET(
  request: NextRequest, // Keep request parameter even if unused for consistency
  { params }: { params: { shopId: string } }
) {
  const shopId = params.shopId;

  try {
    // Fetch drinks and include rating values for calculation
    const drinksWithRatings = await prisma.drink.findMany({
      where: {
        shopId: shopId,
      },
      include: {
        ratings: {
          select: {
            ratingValue: true, // Select only the rating value needed for calculation
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Check if the shop itself exists (Only if no drinks found)
    if (drinksWithRatings.length === 0) {
      const shopExists = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shopExists) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
      }
    }

    // Calculate average rating and count for each drink
    // Define an intermediate type for the drink with included ratings
    type DrinkWithRatings = Prisma.DrinkGetPayload<{
      include: { ratings: { select: { ratingValue: true } } }
    }>;

    const drinksWithAggregates = drinksWithRatings.map((drink: DrinkWithRatings) => {
      const ratingCount = drink.ratings.length;
      let averageRating: number | null = null;
      if (ratingCount > 0) {
        const totalRating = drink.ratings.reduce((sum: number, rating: { ratingValue: number }) => sum + rating.ratingValue, 0);
        averageRating = parseFloat((totalRating / ratingCount).toFixed(1)); // Calculate and round
      }

      // Return a new object excluding the detailed ratings array
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ratings, ...drinkData } = drink; // Destructure to remove ratings
      return {
        ...drinkData,
        averageRating,
        ratingCount,
      };
    });

    return NextResponse.json(drinksWithAggregates);

  } catch (error) { 
    console.error("Failed to fetch drinks for shop:", shopId, error);
    // Avoid exposing detailed errors in production
    return NextResponse.json({ error: 'Failed to fetch drinks' }, { status: 500 });
  }
}
