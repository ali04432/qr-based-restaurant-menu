const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './apps/api/.env' });

const prisma = new PrismaClient();

async function run() {
  const item = await prisma.menuItem.findFirst({
    where: { name: 'Wagyu Beef Steak' },
    include: { arAsset: true }
  });
  console.log('ITEM_ID:', item?.id);
  console.log('RESTAURANT_ID:', item?.restaurantId);
  console.log('AR_ASSET:', item?.arAsset);
  await prisma.$disconnect();
}

run().catch(console.error);
