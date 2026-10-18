import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createDemoDad } from '../src/dad.js';

// GLTFExporter uses FileReader; Node provides Blob but not FileReader.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(value => {
      this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const { root, animate } = createDemoDad();
const groups = [];
root.traverse(node => {
  if (node.isGroup && node !== root) {
    node.name = `Joint_${groups.length}`;
    groups.push(node);
  }
});
const samples = groups.map(node => ({ node, positions: [], rotations: [] }));
const times = [];
const duration = (Math.PI * 4) / 3.8;
const frames = 100;
for (let i = 0; i <= frames; i++) {
  const t = i * duration / frames;
  times.push(t);
  animate(t, false);
  samples.forEach(({ node, positions, rotations }) => {
    positions.push(...node.position.toArray());
    rotations.push(...node.quaternion.toArray());
  });
}
const tracks = samples.flatMap(({ node, positions, rotations }) => [
  new THREE.VectorKeyframeTrack(`${node.name}.position`, times, positions),
  new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, times, rotations),
]);
animate(0, false);
root.updateMatrixWorld(true);
const animation = new THREE.AnimationClip('DadDance', duration, tracks);
const result = await new GLTFExporter().parseAsync(root, { binary: true, animations: [animation], onlyVisible: true });
const target = fileURLToPath(new URL('../public/models/dad.glb', import.meta.url));
await fs.writeFile(target, Buffer.from(result));
console.log(`Exported demo + DadDance animation: ${target} (${result.byteLength} bytes)`);
