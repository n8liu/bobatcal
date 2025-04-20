import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Define a schema for validating the request body
const shopSchema = z.object({
  name: z.string().min(1, { message: 'Shop name is required.' }),
  address: z.string().min(1, { message: 'Address is required.' }),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  // Add other fields like phone, hours if needed in the future
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the request body against the schema
    const validation = shopSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input.', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, address, city, zipCode } = validation.data;

    // Create the shop in the database
    const newShop = await prisma.shop.create({
      data: {
        name,
        address,
        city: city || null, // Set to null if empty string or undefined
        zipCode: zipCode || null, // Set to null if empty string or undefined
      },
    });

    console.log('New shop created:', newShop);

    return NextResponse.json(newShop, { status: 201 }); // 201 Created status

  } catch (error: unknown) {
    console.error('Error creating shop:', error);

    // Check for Zod validation errors first
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Invalid input.', issues: error.issues }, { status: 400 });
    }

    // Handle other potential errors
    let errorMessage = 'An internal server error occurred.';
    if (error instanceof Error) {
        errorMessage = error.message; // Use specific message if available
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// TODO: Implement GET handler if needed to fetch shops via API later
// export async function GET(request: Request) { ... }
