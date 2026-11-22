const { NodeIO } = require('@gltf-transform/core');
const { getBounds } = require('@gltf-transform/functions');
const path = require('path');

const M = path.join(__dirname, '..', 'public', 'models');
const specs = { wagyu_beef_steak: 0.24, pan_seared_salmon: 0.24, braised_lamb_shank: 0.26 };

(async () => {
  const io = new NodeIO();
  for (const [name, target] of Object.entries(specs)) {
    const doc = await io.read(path.join(M, 'originals', name + '.glb'));
    const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
    const b = getBounds(scene);
    const s = target / Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2]);
    for (const n of scene.listChildren()) {
      n.setTranslation(n.getTranslation().map((v) => v * s));
      n.setScale(n.getScale().map((v) => v * s));
    }
    await io.write(path.join(M, name + '.glb'), doc);
    console.log(name, 'scale factor', s.toFixed(6));
  }
})();
