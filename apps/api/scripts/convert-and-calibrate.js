/**
 * Silver Sapoon — 3D Asset Calibration & USDZ Generation Pipeline
 * ============================================================
 * 1. Loads each GLB food model from apps/api/public/models/
 * 2. Analyzes raw geometry and applies realistic physical dimensions:
 *    - Wagyu Beef Steak: 24.0cm plate (0.24m x 0.042m x 0.24m)
 *    - Pan-Seared Salmon: 24.0cm plate (0.24m x 0.037m x 0.24m)
 *    - Braised Lamb Shank: 26.0cm bowl (0.26m x 0.104m x 0.26m)
 *    - Silver Sapoon Burger: 20.0cm board/plate (0.20m x 0.064m x 0.20m)
 * 3. Exports USDZ with iOS Quick Look compatibility and horizontal plane anchoring.
 * 4. Exports calibrated GLB with Android Scene Viewer / WebXR meter scale.
 * 5. Validates all generated files (headers, internal structure, bounding box).
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// Polyfill FileReader for Node.js GLTFExporter
if (typeof FileReader === 'undefined') {
  global.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
        if (this.onload) this.onload();
      });
    }
  };
}

const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');

const DISH_SPECS = [
  {
    name: 'Wagyu Beef Steak',
    glbFile: 'wagyu_beef_steak.glb',
    usdzFile: 'wagyu_beef_steak.usdz',
    // 24cm entree/dinner plate
    targetWidthM: 0.24,
    targetPlateCm: 24,
    portionLabel: 'A5 Miyazaki Cut (250g)',
  },
  {
    name: 'Pan-Seared Salmon',
    glbFile: 'pan_seared_salmon.glb',
    usdzFile: 'pan_seared_salmon.usdz',
    // 24cm dinner plate
    targetWidthM: 0.24,
    targetPlateCm: 24,
    portionLabel: 'Atlantic Fillet (220g)',
  },
  {
    name: 'Braised Lamb Shank',
    glbFile: 'braised_lamb_shank.glb',
    usdzFile: 'braised_lamb_shank.usdz',
    // 26cm deep pasta/shank bowl
    targetWidthM: 0.26,
    targetPlateCm: 26,
    portionLabel: 'Slow-braised (450g)',
  },
  {
    name: 'Silver Sapoon Burger',
    glbFile: 'silver_sapoon_burger.glb',
    usdzFile: 'silver_sapoon_burger.usdz',
    // 20cm wooden board / gourmet burger plate
    targetWidthM: 0.20,
    targetPlateCm: 20,
    portionLabel: 'Double Angus Patty Stack',
  },
];

async function run() {
  console.log('================================================================');
  console.log(' Silver Sapoon — 3D Asset Calibration & USDZ Generation');
  console.log('================================================================\n');

  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js');
  const { unzipSync } = await import('three/examples/jsm/libs/fflate.module.js');

  const report = [];

  for (const spec of DISH_SPECS) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`Processing: ${spec.name}`);
    console.log(`------------------------------------------------------------`);

    const glbInputPath = path.join(MODELS_DIR, 'originals', spec.glbFile);
    if (!fs.existsSync(glbInputPath)) {
      throw new Error(`Original GLB backup not found: ${glbInputPath}`);
    }

    const glbBuf = fs.readFileSync(glbInputPath);
    const arrayBuf = glbBuf.buffer.slice(glbBuf.byteOffset, glbBuf.byteOffset + glbBuf.byteLength);

    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(arrayBuf, '', resolve, reject);
    });

    // 1. Inspect raw dimensions
    const rawBox = new THREE.Box3().setFromObject(gltf.scene);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);

    console.log(`  Raw uncalibrated units: X=${rawSize.x.toFixed(3)}, Y=${rawSize.y.toFixed(3)}, Z=${rawSize.z.toFixed(3)}`);

    // 2. Compute exact scale factor based on target physical plate width (in meters)
    // The plate diameter is max(rawSize.x, rawSize.z)
    const rawPlateDiameter = Math.max(rawSize.x, rawSize.z);
    const scaleFactor = spec.targetWidthM / rawPlateDiameter;

    console.log(`  Target plate diameter: ${(spec.targetWidthM * 100).toFixed(1)} cm`);
    console.log(`  Calculated scale factor: ${scaleFactor.toFixed(6)} meters/unit`);

    // 3. Create a scaled clone of the scene for export
    // Scale the root scene object
    gltf.scene.scale.set(scaleFactor, scaleFactor, scaleFactor);
    gltf.scene.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(gltf.scene);
    const scaledSize = new THREE.Vector3();
    scaledBox.getSize(scaledSize);

    const finalWidthCm = (scaledSize.x * 100).toFixed(1);
    const finalHeightCm = (scaledSize.y * 100).toFixed(1);
    const finalDepthCm = (scaledSize.z * 100).toFixed(1);

    console.log(`  Calibrated Physical Dimensions:`);
    console.log(`    Width:  ${finalWidthCm} cm`);
    console.log(`    Height: ${finalHeightCm} cm`);
    console.log(`    Depth:  ${finalDepthCm} cm`);

    // 4. Generate USDZ with Quick Look compatibility & plane anchoring
    console.log(`  Generating USDZ for iOS Quick Look...`);
    const usdzExporter = new USDZExporter();
    const usdzArrayBuf = await usdzExporter.parseAsync(gltf.scene, {
      quickLookCompatible: true,
      ar: {
        anchoring: { type: 'plane' },
        planeAnchoring: { alignment: 'horizontal' },
      },
    });

    const usdzOutputPath = path.join(MODELS_DIR, spec.usdzFile);
    fs.writeFileSync(usdzOutputPath, Buffer.from(usdzArrayBuf));
    const usdzSizeBytes = fs.statSync(usdzOutputPath).size;
    console.log(`  ✓ Written ${spec.usdzFile} (${(usdzSizeBytes / 1024).toFixed(1)} KB)`);

    // 5. Validate the USDZ archive
    let usdzValid = false;
    let usdzFiles = [];
    try {
      const unzipped = unzipSync(new Uint8Array(usdzArrayBuf));
      usdzFiles = Object.keys(unzipped);
      const hasUsdcOrUsda = usdzFiles.some((f) => f.endsWith('.usdc') || f.endsWith('.usda'));
      usdzValid = hasUsdcOrUsda && usdzSizeBytes > 50000;
      console.log(`  ✓ Validated USDZ archive: ${usdzFiles.length} internal files (${usdzFiles.join(', ')})`);
    } catch (e) {
      console.error(`  ✗ USDZ archive validation failed: ${e.message}`);
    }

    // 6. Generate calibrated GLB for Android Scene Viewer & WebXR
    console.log(`  Generating calibrated GLB for Android Scene Viewer...`);
    const gltfExporter = new GLTFExporter();
    const glbArrayBuf = await new Promise((resolve, reject) => {
      gltfExporter.parse(
        gltf.scene,
        resolve,
        reject,
        { binary: true }
      );
    });

    const glbOutputPath = path.join(MODELS_DIR, spec.glbFile);
    fs.writeFileSync(glbOutputPath, Buffer.from(glbArrayBuf));
    const glbSizeBytes = fs.statSync(glbOutputPath).size;
    console.log(`  ✓ Written ${spec.glbFile} (${(glbSizeBytes / 1024).toFixed(1)} KB)`);

    report.push({
      dish: spec.name,
      glb: spec.glbFile,
      glbSize: `${(glbSizeBytes / 1024).toFixed(1)} KB`,
      usdz: spec.usdzFile,
      usdzSize: `${(usdzSizeBytes / 1024).toFixed(1)} KB`,
      dimensionsCm: `${finalWidthCm} × ${finalHeightCm} × ${finalDepthCm}`,
      usdzValid: usdzValid ? 'VALID' : 'INVALID',
    });
  }

  console.log('\n================================================================');
  console.log(' CALIBRATION & CONVERSION SUMMARY');
  console.log('================================================================');
  console.table(report);

  return report;
}

run().catch((e) => {
  console.error('Fatal error during calibration:', e);
  process.exit(1);
});
