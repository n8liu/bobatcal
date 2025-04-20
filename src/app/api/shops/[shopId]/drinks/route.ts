// src/app/api/shops/[shopId]/drinks/route.ts
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
    const drinks = await prisma.drink.findMany({
      where: {
        shopId: shopId,
      },
      orderBy: {
        name: 'asc', // Optional: order drinks alphabetically
      },
    });

    // Check if the shop itself exists (optional, but good practice)
    // If drinks are found, the shop must exist. If no drinks, maybe check shop?
    if (drinks.length === 0) {
        const shopExists = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shopExists) {
             return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
        }
    }

    return NextResponse.json(drinks);
  } catch (error) {
    console.error(`Failed to fetch drinks for shop ${shopId}:`, error);
    // Avoid exposing detailed errors in production
    return NextResponse.json({ error: 'Failed to fetch drinks' }, { status: 500 });
  }
}
