#!/usr/bin/env node
/**
 * Silver Sapoon — USDZ Generation Script
 * ============================================================
 * This script converts existing GLB food models to USDZ format
 * for iOS Quick Look AR support.
 *
 * IMPORTANT: USDZ generation requires one of the following tools:
 *
 * Option A: Blender (recommended, free)
 *   Install from https://www.blender.org/download/
 *   Must be in PATH or BLENDER_PATH env var
 *
 * Option B: Apple Reality Converter (macOS only)
 *   Download from https://developer.apple.com/augmented-reality/tools/
 *
 * Option C: Reality Composer (macOS / Xcode)
 *
 * Option D: usdz_converter CLI (macOS SDK tool)
 *   Available via Xcode Command Line Tools on macOS
 *
 * Option E: gltf-to-usdz npm package
 *   Run: npx gltf-to-usdz <input.glb> <output.usdz>
 *   NOTE: Quality may be lower than Blender
 *
 * ============================================================
 * USAGE:
 *   node apps/api/scripts/generate-usdz.js
 *
 * After USDZ files are generated, run:
 *   node apps/api/scripts/update-usdz-db.js
 * to update the iosModelUrl field in the database.
 * ============================================================
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawnSync } = require('child_process');

const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');
const ORIGINALS_DIR = path.join(MODELS_DIR, 'originals');

// Food model definitions — each GLB maps to a USDZ output
const MODELS = [
  {
    name: 'Wagyu Beef Steak',
    glb: 'wagyu_beef_steak.glb',
    usdz: 'wagyu_beef_steak.usdz',
    // Real-world physical dimensions (cm) — used for AR placement calibration
    widthCm: 22,
    heightCm: 6,
    depthCm: 18,
  },
  {
    name: 'Pan-Seared Salmon',
    glb: 'pan_seared_salmon.glb',
    usdz: 'pan_seared_salmon.usdz',
    widthCm: 20,
    heightCm: 7,
    depthCm: 18,
  },
  {
    name: 'Braised Lamb Shank',
    glb: 'braised_lamb_shank.glb',
    usdz: 'braised_lamb_shank.usdz',
    widthCm: 24,
    heightCm: 12,
    depthCm: 20,
  },
  {
    name: 'Silver Sapoon Burger',
    glb: 'silver_sapoon_burger.glb',
    usdz: 'silver_sapoon_burger.usdz',
    widthCm: 15,
    heightCm: 14,
    depthCm: 15,
  },
];

// ── Helpers ──────────────────────────────────────────────────

function log(msg) {
  console.log(`[usdz-gen] ${msg}`);
}

function exists(p) {
  return fs.existsSync(p);
}

function fileSize(p) {
  try {
    const stat = fs.statSync(p);
    return `${(stat.size / 1024).toFixed(1)} KB`;
  } catch {
    return 'unknown';
  }
}

// Back up original GLBs before any modification
function ensureBackup(glbName) {
  if (!exists(ORIGINALS_DIR)) {
    fs.mkdirSync(ORIGINALS_DIR, { recursive: true });
    log(`Created originals backup directory: ${ORIGINALS_DIR}`);
  }
  const src = path.join(MODELS_DIR, glbName);
  const dst = path.join(ORIGINALS_DIR, glbName);
  if (!exists(dst) && exists(src)) {
    fs.copyFileSync(src, dst);
    log(`  Backed up ${glbName} → originals/${glbName}`);
  }
}

// ── Conversion methods ────────────────────────────────────────

/**
 * Try converting with Blender CLI.
 * Blender can export USDZ via its built-in USD IO plugin.
 */
function tryBlender(glbPath, usdzPath) {
  const blenderExe =
    process.env.BLENDER_PATH ||
    'blender';

  // Inline Blender Python script for GLB → USDZ
  const blenderScript = `
import bpy, sys, os
argv = sys.argv[sys.argv.index('--') + 1:]
glb_path = argv[0]
usdz_path = argv[1]
# Clear scene
bpy.ops.wm.read_factory_settings(use_empty=True)
# Import GLB
bpy.ops.import_scene.gltf(filepath=glb_path)
# Export as USDZ
bpy.ops.wm.usd_export(
    filepath=usdz_path,
    export_animation=False,
    export_hair=False,
    export_uvmaps=True,
    export_normals=True,
    export_materials=True,
    file_format='USDC',
    usdz_path=usdz_path,
)
sys.exit(0)
`.trim();

  const scriptFile = path.join(require('os').tmpdir(), 'blender_usdz.py');
  fs.writeFileSync(scriptFile, blenderScript, 'utf8');

  try {
    const result = spawnSync(
      blenderExe,
      ['--background', '--python', scriptFile, '--', glbPath, usdzPath],
      { timeout: 120000, encoding: 'utf8' }
    );
    if (result.status === 0 && exists(usdzPath)) {
      return true;
    }
    log(`  Blender exit ${result.status}: ${result.stderr?.slice(0, 300)}`);
    return false;
  } catch (e) {
    log(`  Blender not available: ${e.message}`);
    return false;
  }
}

/**
 * Try converting with gltf-to-usdz npm package.
 */
function tryGltfToUsdz(glbPath, usdzPath) {
  try {
    execSync(`npx --yes gltf-to-usdz "${glbPath}" "${usdzPath}"`, {
      timeout: 60000,
      stdio: 'pipe',
    });
    return exists(usdzPath);
  } catch (e) {
    log(`  gltf-to-usdz failed: ${e.message?.slice(0, 200)}`);
    return false;
  }
}

/**
 * Try macOS usdz_converter (available in Xcode SDK).
 */
function tryUsdzConverter(glbPath, usdzPath) {
  try {
    execSync(`xcrun usdz_converter "${glbPath}" "${usdzPath}"`, {
      timeout: 60000,
      stdio: 'pipe',
    });
    return exists(usdzPath);
  } catch (e) {
    log(`  usdz_converter not available: ${e.message?.slice(0, 100)}`);
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  log('Silver Sapoon USDZ Generation Script');
  log('='.repeat(50));

  if (!exists(MODELS_DIR)) {
    console.error(`Models directory not found: ${MODELS_DIR}`);
    process.exit(1);
  }

  const results = [];

  for (const model of MODELS) {
    const glbPath = path.join(MODELS_DIR, model.glb);
    const usdzPath = path.join(MODELS_DIR, model.usdz);

    log(`\n[${model.name}]`);
    log(`  GLB:  ${model.glb} (${exists(glbPath) ? fileSize(glbPath) : 'MISSING'})`);
    log(`  USDZ: ${model.usdz}`);

    if (!exists(glbPath)) {
      log(`  SKIP — GLB source not found`);
      results.push({ model: model.name, status: 'SKIPPED', reason: 'GLB not found' });
      continue;
    }

    if (exists(usdzPath)) {
      log(`  EXISTS — ${fileSize(usdzPath)}, skipping re-conversion`);
      log(`  To re-convert, delete: ${usdzPath}`);
      results.push({ model: model.name, status: 'EXISTING', size: fileSize(usdzPath) });
      continue;
    }

    // Back up original GLB before we start
    ensureBackup(model.glb);

    // Try conversion methods in order
    let success = false;

    log('  Attempting Blender conversion...');
    success = tryBlender(glbPath, usdzPath);

    if (!success) {
      log('  Attempting gltf-to-usdz conversion...');
      success = tryGltfToUsdz(glbPath, usdzPath);
    }

    if (!success) {
      log('  Attempting macOS usdz_converter...');
      success = tryUsdzConverter(glbPath, usdzPath);
    }

    if (success) {
      log(`  SUCCESS — ${fileSize(usdzPath)}`);
      results.push({ model: model.name, status: 'CONVERTED', size: fileSize(usdzPath) });
    } else {
      log(`  FAILED — no conversion tool available`);
      results.push({
        model: model.name,
        status: 'FAILED',
        reason: 'No USDZ conversion tool found. Install Blender or run on macOS with Xcode.',
      });
    }
  }

  // Print summary
  log('\n' + '='.repeat(50));
  log('RESULTS:');
  for (const r of results) {
    const statusIcon =
      r.status === 'CONVERTED' ? '✓' :
      r.status === 'EXISTING' ? '=' :
      r.status === 'SKIPPED' ? '-' : '✗';
    log(`  ${statusIcon} ${r.model}: ${r.status}${r.size ? ` (${r.size})` : ''}${r.reason ? ` — ${r.reason}` : ''}`);
  }

  const failed = results.filter((r) => r.status === 'FAILED');
  if (failed.length > 0) {
    log('\n⚠ USDZ GENERATION INCOMPLETE');
    log('Install one of the following tools and re-run this script:');
    log('');
    log('  1. Blender (Windows/Mac/Linux, free):');
    log('     https://www.blender.org/download/');
    log('     Set BLENDER_PATH env var if not in system PATH');
    log('');
    log('  2. Apple Reality Converter (macOS only, free):');
    log('     https://developer.apple.com/augmented-reality/tools/');
    log('');
    log('  3. Xcode + usdz_converter (macOS only):');
    log('     Install Xcode from App Store, then:');
    log('     xcrun usdz_converter <input.glb> <output.usdz>');
    log('');
    log('NOTE: iOS Quick Look AR will not work until USDZ files are present.');
    log('Android Scene Viewer AR works with GLB files and is unaffected.');
    process.exit(1);
  }

  log('\n✓ All USDZ files ready.');
  log('Next step: run `node apps/api/scripts/update-usdz-db.js` to update the database.');
}

main().catch((e) => {
  console.error('[usdz-gen] Fatal error:', e);
  process.exit(1);
});

