// src/app/api/shops/[shopId]/route.ts
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest, // Keep request parameter even if unused for standard signature
  { params }: { params: { shopId: string } }
) {
  const { shopId } = params;

  if (!shopId) {
    return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
  }

  try {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json(shop);
  } catch (error) {
    console.error(`Error fetching shop ${shopId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch shop details' }, { status: 500 });
  }
}
