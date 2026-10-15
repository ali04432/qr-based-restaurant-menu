/**
 * seed-ar-asset.ts
 * ─────────────────────────────────────────────────────────────
 * Idempotent seed: creates ONE sample ArAsset linked to the
 * first available MenuItem in the database.
 *
 * The asset uses the avocado.glb sample model shipped with the
 * project (apps/web/public/models/avocado.glb).
 *
 * This is a SAMPLE / PLACEHOLDER, clearly labelled in the DB.
 * Replace with real food models before going to production.
 *
 * Usage (from repo root):
 *   cd apps/api
 *   npx ts-node --project tsconfig.json -e "require('./scripts/seed-ar-asset.ts')"
 *
 * Or add to package.json scripts:
 *   "seed:ar": "ts-node --transpile-only scripts/seed-ar-asset.ts"
 * ─────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The avocado.glb is served by Next.js from apps/web/public/models/.
// When running behind a tunnel, this will be accessible as:
//   https://<tunnel-url>/models/avocado.glb
// For local dev:
//   http://localhost:3000/models/avocado.glb
// We store a relative URL so it adapts to any domain.
const SAMPLE_MODEL_URL = '/models/avocado.glb';

// Label used in the name and metadata to make it clear this is a sample
const SAMPLE_LABEL = '[SAMPLE MODEL – not the actual dish]';

async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  AR Asset Seed Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. Find the first active restaurant
  const restaurant = await prisma.restaurant.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!restaurant) {
    console.error('❌ No restaurants found in the database.');
    console.error('   Run the main seed or create a restaurant first.');
    process.exit(1);
  }

  console.log(`✅ Restaurant found: "${restaurant.name}" (${restaurant.id})`);

  // 2. Find the first available menu item that does NOT already have an ArAsset
  const menuItem = await prisma.menuItem.findFirst({
    where: {
      restaurantId: restaurant.id,
      isAvailable: true,
      arAsset: null, // Only items without an existing asset
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!menuItem) {
    // Check if ALL items already have assets
    const itemWithAsset = await prisma.menuItem.findFirst({
      where: { restaurantId: restaurant.id, arAsset: { isNot: null } },
    });

    if (itemWithAsset) {
      console.log('ℹ️  All menu items already have AR assets. Nothing to seed.');
    } else {
      console.error('❌ No menu items found for this restaurant.');
      console.error('   Add menu items first, then run this seed.');
    }
    return;
  }

  console.log(`✅ Menu item found: "${menuItem.name}" (${menuItem.id})`);

  // 3. Check if an ArAsset with this model URL already exists (idempotency guard)
  const existing = await prisma.arAsset.findFirst({
    where: {
      restaurantId: restaurant.id,
      modelUrl: SAMPLE_MODEL_URL,
    },
  });

  if (existing) {
    console.log(`ℹ️  Sample ArAsset already exists (id: ${existing.id}). Skipping.`);
    console.log('   Re-run only needed if you deleted the asset or want to link another item.');
    return;
  }

  // 4. Create the sample ArAsset
  const asset = await prisma.arAsset.create({
    data: {
      restaurantId: restaurant.id,
      menuItemId: menuItem.id,
      // Name clearly labelled as sample
      name: `${menuItem.name} ${SAMPLE_LABEL}`,
      assetType: 'MODEL_3D',
      modelUrl: SAMPLE_MODEL_URL,
      iosModelUrl: null, // No USDZ yet — iOS AR will fall back gracefully
      previewImage: menuItem.image ?? null,
      mimeType: 'model/gltf-binary',
      fileSize: 8328156, // Avocado.glb actual size: ~8.3 MB (see README for source)
      scale: 1.0,
      // Approximate real-world dish dimensions (avocado is not a dish, but good for testing scale)
      widthCm: 20.0,
      heightCm: 8.0,
      depthCm: 20.0,
      portionLabel: 'Sample – avocado placeholder',
      status: 'ACTIVE',
      metadata: JSON.stringify({
        isSample: true,
        sampleSource: 'Khronos glTF Sample Assets (MIT License)',
        sampleUrl: 'https://github.com/KhronosGroup/glTF-Sample-Assets',
        note: 'Replace with a real food model before going to production.',
        seededAt: new Date().toISOString(),
      }),
    },
  });

  console.log('');
  console.log(`✅ Sample ArAsset created!`);
  console.log(`   Asset ID    : ${asset.id}`);
  console.log(`   Menu Item   : ${menuItem.name} (${menuItem.id})`);
  console.log(`   Model URL   : ${asset.modelUrl}`);
  console.log(`   Status      : ${asset.status}`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Next Steps');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Open the customer menu and click on:', menuItem.name);
  console.log('2. The 3D viewer should now appear (avocado placeholder).');
  console.log('3. Upload real food models via Admin → AR / 3D Assets.');
  console.log('');
  console.log('⚠️  IMPORTANT: The customer UI shows a notice that this');
  console.log('   is a sample model, not the actual dish.');
  console.log('');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
