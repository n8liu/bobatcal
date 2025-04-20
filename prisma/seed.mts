import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Delete existing data first (optional, but useful for repeatable seeds)
  await prisma.rating.deleteMany();
  await prisma.drink.deleteMany();
  await prisma.shop.deleteMany();
  console.log('Deleted existing data.');

  // Create sample shops
  const shop1 = await prisma.shop.create({
    data: {
      name: 'Boba Guys',
      address: '123 Main St',
      city: 'San Francisco',
      zipCode: '94107',
      phone: '415-555-1234',
      hours: 'Mon-Sun: 11am - 9pm',
    },
  });
  console.log(`Created shop: ${shop1.name} (ID: ${shop1.id})`);

  const shop2 = await prisma.shop.create({
    data: {
      name: 'Teaspoon',
      address: '456 Oak Ave',
      city: 'Palo Alto',
      zipCode: '94301',
      hours: 'Mon-Fri: 10am - 8pm, Sat-Sun: 11am - 7pm',
    },
  });
  console.log(`Created shop: ${shop2.name} (ID: ${shop2.id})`);

  const shop3 = await prisma.shop.create({
    data: {
      name: 'Sharetea',
      address: '789 Pine Ln',
      city: 'San Francisco',
      zipCode: '94102',
    },
  });
  console.log(`Created shop: ${shop3.name} (ID: ${shop3.id})`);

  // Create sample drinks for shops individually with logging
  console.log('Creating sample drinks...');
  const drinksToCreate = [
    // Boba Guys Drinks
    { name: 'Classic Milk Tea', shopId: shop1.id },
    { name: 'Strawberry Matcha Latte', shopId: shop1.id },
    { name: 'Hong Kong Milk Tea', shopId: shop1.id },
    // Teaspoon Drinks
    { name: 'House Milk Tea', shopId: shop2.id },
    { name: 'Liquid Gold', shopId: shop2.id },
    // Sharetea Drinks
    { name: 'Okinawa Pearl Milk Tea', shopId: shop3.id },
    { name: 'QQ Happy Family Milk Tea', shopId: shop3.id },
    { name: 'Taro Pearl Milk Tea', shopId: shop3.id },
  ];

  for (const drinkData of drinksToCreate) {
    try {
      const createdDrink = await prisma.drink.create({
        data: drinkData,
      });
      console.log(`-- Created drink: ${createdDrink.name} for shop ID ${createdDrink.shopId}`);
    } catch (error) {
      console.error(`!! Failed to create drink '${drinkData.name}' for shop ID ${drinkData.shopId}:`, error);
    }
  }
  console.log('Finished creating sample drinks.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
