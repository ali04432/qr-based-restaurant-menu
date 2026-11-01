const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: __dirname + '/../.env' });

const prisma = new PrismaClient();

const dishModels = [
  {
    id: 'bac6c92a-b96b-46d8-b746-1b374939bf43',
    name: 'Wagyu Beef Steak',
    assetName: 'Wagyu Beef Steak 3D Model',
    modelUrl: '/models/wagyu_beef_steak.glb',
    fileSize: 860900,
    widthCm: 22.0,
    heightCm: 6.0,
    depthCm: 18.0,
    portionLabel: 'A5 Miyazaki Cut (250g)',
    scale: 1.0,
    previewImage: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800',
  },
  {
    id: '98c7d921-a833-498f-83c6-028d301c7d94',
    name: 'Pan-Seared Salmon',
    assetName: 'Pan-Seared Salmon 3D Model',
    modelUrl: '/models/pan_seared_salmon.glb',
    fileSize: 1246128,
    widthCm: 20.0,
    heightCm: 7.0,
    depthCm: 18.0,
    portionLabel: 'Atlantic Fillet (220g)',
    scale: 1.0,
    previewImage: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
  },
  {
    id: '7926400a-e47a-4f77-b9f7-d1c3fa5f6a1b',
    name: 'Braised Lamb Shank',
    assetName: 'Braised Lamb Shank 3D Model',
    modelUrl: '/models/braised_lamb_shank.glb',
    fileSize: 383456,
    widthCm: 24.0,
    heightCm: 12.0,
    depthCm: 20.0,
    portionLabel: 'Slow-braised (450g)',
    scale: 1.0,
    previewImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
  },
  {
    id: '6870227a-9df2-462b-b2bc-678d11e0b203',
    name: 'Silver Sapoon Burger',
    assetName: 'Silver Sapoon Burger 3D Model',
    modelUrl: '/models/silver_sapoon_burger.glb',
    fileSize: 878208,
    widthCm: 15.0,
    heightCm: 14.0,
    depthCm: 15.0,
    portionLabel: 'Double Angus Patty Stack',
    scale: 1.0,
    previewImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  },
];

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Seeding 3D Food Models into AR Assets');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const restaurant = await prisma.restaurant.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!restaurant) {
    console.error('No restaurant found in DB');
    process.exit(1);
  }

  console.log(`Using restaurant: "${restaurant.name}" (${restaurant.id})`);

  for (const dish of dishModels) {
    const item = await prisma.menuItem.findUnique({
      where: { id: dish.id },
    });

    if (!item) {
      console.warn(`MenuItem with ID ${dish.id} (${dish.name}) not found, skipping.`);
      continue;
    }

    const existingAsset = await prisma.arAsset.findUnique({
      where: { menuItemId: dish.id },
    });

    const data = {
      restaurantId: restaurant.id,
      menuItemId: dish.id,
      name: dish.assetName,
      assetType: 'MODEL_3D',
      modelUrl: dish.modelUrl,
      iosModelUrl: null,
      previewImage: dish.previewImage,
      mimeType: 'model/gltf-binary',
      fileSize: dish.fileSize,
      scale: dish.scale,
      widthCm: dish.widthCm,
      heightCm: dish.heightCm,
      depthCm: dish.depthCm,
      portionLabel: dish.portionLabel,
      status: 'ACTIVE',
      metadata: JSON.stringify({
        isSample: false,
        dishName: dish.name,
        integratedAt: new Date().toISOString(),
      }),
    };

    if (existingAsset) {
      const updated = await prisma.arAsset.update({
        where: { id: existingAsset.id },
        data,
      });
      console.log(`  Updated AR Asset for "${dish.name}" -> ${updated.modelUrl} (ID: ${updated.id})`);
    } else {
      const created = await prisma.arAsset.create({
        data,
      });
      console.log(`  Created AR Asset for "${dish.name}" -> ${created.modelUrl} (ID: ${created.id})`);
    }
  }

  console.log('\nAll 4 dishes now have their unique 3D GLB models assigned!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
