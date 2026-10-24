# 3D Model Assets — Source, License & Credits

This directory contains 3D model files used by the AR/3D viewer feature.

---

## Sample / Placeholder Models

The following models are **test assets only**. They are clearly labelled in the Admin Panel
and the Customer UI as "Sample model – not the actual dish". **Replace them with real food
models before going to production.**

### avocado.glb

| Field | Value |
|---|---|
| **Filename** | `avocado.glb` |
| **File size** | ~8.3 MB (see compression note below) |
| **Format** | glTF Binary (.glb) |
| **Source** | [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) |
| **License** | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| **Author / Credit** | Microsoft — donated to the Khronos Group glTF sample repository |
| **Original path** | `Models/Avocado/glTF-Binary/Avocado.glb` in the Khronos repository |

> ⚠️ **Note on file size**: The current avocado.glb is ~8.3 MB, which exceeds the recommended
> 3–5 MB target. Compressing it with `gltf-transform` is recommended (see below).
> The 10 MB hard upload limit still allows it, but mobile load times will be slower.

---

## How to Get Real Food Models (3 Options)

### Option 1 — Phone Photogrammetry (free, best for your own dishes)
1. Use **Polycam** (iOS/Android) or **Luma AI** (iOS/Android).
2. Take 30–60 photos walking around the plated dish on a table.
3. Export as **GLB** (and optionally **USDZ** for iOS).
4. Upload via Admin Panel → AR / 3D Assets.

### Option 2 — Hire a 3D Artist
- Platforms: Fiverr, Upwork, or 3D marketplaces (CGTrader, TurboSquid).
- **Export settings to request:**
  - Format: `.glb` (+ `.usdz` for iOS AR)
  - PBR textures (metallic-roughness workflow)
  - Real-world scale in **metres** (e.g. a plate = 0.26 m diameter)
  - Max texture size: 2048×2048 px (prefer 1024×1024 for mobile)
  - Geometry compression: Draco or Meshopt
  - Target file size: under 5 MB per model

### Option 3 — Licensed Assets
- [Sketchfab](https://sketchfab.com) — filter by "CC" license, download as GLB.
- [Poly Pizza](https://poly.pizza) — free CC0 models.
- **Always record the license and author here when you add a model.**

---

## Compression Guide

To compress an oversized `.glb` file:

```bash
# Install gltf-transform globally (one-time)
npm install --global @gltf-transform/cli

# Compress with Draco geometry + KTX2 textures
npx gltf-transform optimize input.glb output.glb --compress draco

# Or just resize textures to max 1024px
npx gltf-transform resize input.glb output.glb --width 1024 --height 1024

# Check the size of the result
ls -lh output.glb
```

For `.usdz` files: use **Reality Converter** (Mac) or **Xcode** to re-export at lower quality.

---

## File Naming Convention

All uploaded models are renamed to a UUID on upload (e.g. `550e8400-e29b-41d4-a716-446655440000.glb`).
This prevents filename collisions and avoids exposing internal naming. The original name is
stored in the ArAsset database record.

---

## Production Upload Checklist

Before uploading a production food model:

- [ ] File is `.glb` or `.usdz` (no other formats)
- [ ] File size is under 5 MB (hard limit: 10 MB)
- [ ] Model has PBR textures
- [ ] Textures are ≤ 2048×2048 px
- [ ] Model is at real-world scale in metres
- [ ] Source and license are recorded in this README
- [ ] Model is not labelled as "Sample" in the Admin Panel
- [ ] Tested on a real Android device (Chrome) and iPhone (Safari)
