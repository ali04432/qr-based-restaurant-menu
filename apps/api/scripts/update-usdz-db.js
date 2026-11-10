/**
 * Silver Sapoon — Update iosModelUrl and Dimensions in Database
 * ============================================================
 * Uses the compiled Prisma client to update the Neon PostgreSQL
 * ArAsset records for all 4 dishes with:
 * - iosModelUrl (/models/<name>.usdz)
 * - Calibrated real-world physical dimensions (widthCm, heightCm, depthCm)
 * ============================================================
 */

const path = require('path');
const fs = require('fs');

// Explicitly parse .env and clean quotes
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const k = trimmed.slice(0, eq).trim();
        const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        process.env[k] = v;
      }
    }
  }
}

const { prisma } = require('../dist/config/database');

const USDZ_UPDATES = [
  {
    menuItemId: 'bac6c92a-b96b-46d8-b746-1b374939bf43',
    name: 'Wagyu Beef Steak',
    glbModelUrl: '/models/wagyu_beef_steak.glb',
    iosModelUrl: '/models/wagyu_beef_steak.usdz',
    widthCm: 24.0,
    heightCm: 4.2,
    depthCm: 24.0,
  },
  {
    menuItemId: '98c7d921-a833-498f-83c6-028d301c7d94',
    name: 'Pan-Seared Salmon',
    glbModelUrl: '/models/pan_seared_salmon.glb',
    iosModelUrl: '/models/pan_seared_salmon.usdz',
    widthCm: 24.0,
    heightCm: 3.7,
    depthCm: 24.0,
  },
  {
    menuItemId: '7926400a-e47a-4f77-b9f7-d1c3fa5f6a1b',
    name: 'Braised Lamb Shank',
    glbModelUrl: '/models/braised_lamb_shank.glb',
    iosModelUrl: '/models/braised_lamb_shank.usdz',
    widthCm: 26.0,
    heightCm: 10.4,
    depthCm: 26.0,
  },
  {
    menuItemId: '6870227a-9df2-462b-b2bc-678d11e0b203',
    name: 'Silver Sapoon Burger',
    glbModelUrl: '/models/silver_sapoon_burger.glb',
    iosModelUrl: '/models/silver_sapoon_burger.usdz',
    widthCm: 20.0,
    heightCm: 6.4,
    depthCm: 20.0,
  },
];

async function main() {
  console.log('================================================================');
  console.log(' Updating Neon PostgreSQL ArAsset Records');
  console.log('================================================================\n');

  const results = [];

  for (const entry of USDZ_UPDATES) {
    try {
      const updated = await prisma.arAsset.update({
        where: { menuItemId: entry.menuItemId },
        data: {
          modelUrl: entry.glbModelUrl,
          iosModelUrl: entry.iosModelUrl,
          widthCm: entry.widthCm,
          heightCm: entry.heightCm,
          depthCm: entry.depthCm,
          status: 'ACTIVE',
        },
      });

      console.log(`  ✓ ${entry.name}:`);
      console.log(`      modelUrl:    ${updated.modelUrl}`);
      console.log(`      iosModelUrl: ${updated.iosModelUrl}`);
      console.log(`      dimensions:  ${updated.widthCm} x ${updated.heightCm} x ${updated.depthCm} cm`);

      results.push({
        dish: entry.name,
        glb: updated.modelUrl,
        usdz: updated.iosModelUrl,
        dimensions: `${updated.widthCm} × ${updated.heightCm} × ${updated.depthCm} cm`,
        status: 'UPDATED',
      });
    } catch (err) {
      console.error(`  ✗ ${entry.name}: ${err.message}`);
      results.push({ dish: entry.name, status: 'ERROR', error: err.message });
    }
  }

  await prisma.$disconnect();

  console.log('\n================================================================');
  console.log(' DATABASE UPDATE SUMMARY');
  console.log('================================================================');
  console.table(results);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
