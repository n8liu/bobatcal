// src/app/api/drinks/[drinkId]/ratings/route.ts
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Corrected import path

const prisma = new PrismaClient();

// Input validation schema
const ratingSchema = z.object({
  ratingValue: z.number().min(1.0).max(5.0), // Ensure rating is between 1 and 5
  reviewText: z.string().max(1000).optional(), // Optional review, max 1000 chars
});

// Define local interface for the Rating structure including selected user data
interface SimpleRatingWithUser {
  id: string;
  ratingValue: number;
  reviewText: string | null;
  createdAt: Date; 
  user: {
    name: string | null;
    image: string | null;
  };
  // Omit drinkId, userId if not needed directly in the response structure being typed
}

export async function POST(
  request: NextRequest,
  { params }: { params: { drinkId: string } }
) {
  // 1. Get User Session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const drinkId = params.drinkId;

  // 2. Validate Drink ID exists (optional but good practice)
  try {
    const drink = await prisma.drink.findUnique({ where: { id: drinkId } });
    if (!drink) {
      return NextResponse.json({ error: 'Drink not found' }, { status: 404 });
    }
  } catch (error) {
      console.error("Error finding drink:", error);
      return NextResponse.json({ error: 'Failed to verify drink' }, { status: 500 });
  }

  // 3. Parse and validate request body
  let validatedData;
  try {
    const body = await request.json();
    validatedData = ratingSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error("Error parsing request body:", error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 4. Upsert the rating (Create or Update)
  try {
    const rating = await prisma.rating.upsert({
      where: {
        // Unique constraint based on user and drink
        userId_drinkId: {
          userId: userId,
          drinkId: drinkId,
        },
      },
      update: {
        // Fields to update if rating already exists
        ratingValue: validatedData.ratingValue,
        reviewText: validatedData.reviewText ?? null, // Use null if undefined
      },
      create: {
        // Fields to set if creating a new rating
        ratingValue: validatedData.ratingValue,
        reviewText: validatedData.reviewText ?? null,
        userId: userId,
        drinkId: drinkId,
      },
    });
    return NextResponse.json(rating, { status: 200 }); // Return 200 OK for upsert
  } catch (error) {
    console.error(`Error saving rating for drink ${drinkId} and user ${session.user.id}:`, error);
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
  }
}

// Add GET handler to fetch ratings for a drink
export async function GET(
  request: NextRequest, // Although unused, it's the standard signature
  { params }: { params: { drinkId: string } }
) {
  const drinkId = params.drinkId;

  if (!drinkId) {
      return NextResponse.json({ error: 'Drink ID is required' }, { status: 400 });
  }

  try {
      // Fetch ratings, including related user data (name and image)
      // Type the result with our local interface
      const ratings: SimpleRatingWithUser[] = await prisma.rating.findMany({
          where: { drinkId: drinkId },
          include: {
              user: {
                  select: { name: true, image: true } // Select only needed user fields
              }
          },
          orderBy: {
              createdAt: 'desc' // Show newest ratings first
          }
      });

      // Calculate average rating
      let averageRating = 0;
      if (ratings.length > 0) {
          // Use local interface for the rating parameter type
          const totalRating = ratings.reduce((sum: number, rating: SimpleRatingWithUser) => sum + rating.ratingValue, 0); 
          averageRating = parseFloat((totalRating / ratings.length).toFixed(1)); // Round to one decimal place
      }

      // Return both the list of ratings and the calculated average
      return NextResponse.json({
          averageRating: averageRating,
          ratings: ratings,
          ratingCount: ratings.length
      }, { status: 200 });

  } catch (error) {
      console.error(`Error fetching ratings for drink ${drinkId}:`, error);
      // Check if the error is because the drinkId doesn't exist
      if (error instanceof Error && error.message.includes('findUnique')) {
           // Prisma might throw if the underlying drink doesn't exist,
           // but fetching ratings for a non-existent drink should arguably return empty, not 500.
           // Let's return 404 if the drink itself isn't found during the rating fetch (less likely here).
           // A better approach might be to check drink existence *before* fetching ratings.
           // For now, we'll assume the drink exists if we reach here or return 500 for general errors.
           return NextResponse.json({ error: 'Failed to fetch ratings - potentially invalid drink ID' }, { status: 404 }); // Or 500?
      }
      return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
  }
}
