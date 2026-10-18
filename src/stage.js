import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createDemoDad } from './dad.js';
import { getStoryState } from './story.js';
import { createStageLighting } from './lighting.js';
import { createMotionStabilizer } from './model-motion.js';
import { prepareDanceClip } from './dance-clip.js';
import { assetUrl } from './asset-url.js';

export function createStage(canvas, options = {}) {
  let reducedMotion = !!options.reducedMotion;
  let disposed = false;
  let progress = 0;
  let time = 0;
  let previousTime = 0;
  let raf;
  let width = 0, height = 0;
  let mixer = null;
  let externalModel = null;
  let hasAnimation = false;
  let stabilizeMotion = () => {};
  const controller = new AbortController();
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.20;
  const camera = new THREE.OrthographicCamera(-5, 5, 2.7, -2.7, 0.1, 35);
  camera.position.set(0, 2.1, 10);
  camera.lookAt(0, 2.1, 0);
  const lighting = createStageLighting(scene);

  const actor = new THREE.Group();
  scene.add(actor);
  const demo = createDemoDad();
  actor.add(demo.root);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ opacity: 0.30 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.065;
  floor.receiveShadow = true;
  scene.add(floor);

  // A shadow catcher tilted toward the camera keeps the grounding readable
  // with a fixed frontal camera and the photographic background.
  camera.position.y = 2.65;
  camera.lookAt(0, 2.1, 0);

  function disposeObject(object) {
    object.traverse(child => {
      if (!child.isMesh) return;
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!material) continue;
        for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
        material.dispose();
      }
    });
  }

  async function loadCustomModel() {
    try {
      const response = await fetch(assetUrl('model-config.json'), { signal: controller.signal });
      if (!response.ok) return;
      const config = await response.json();
      if (!config.modelUrl || disposed) return;
      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(assetUrl(config.modelUrl));
      if (disposed) { disposeObject(gltf.scene); return; }
      const model = gltf.scene;
      model.rotation.y = Number(config.rotationY) || 0;
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const modelHeight = Math.max(size.y, 0.001);
      const desiredHeight = Number(config.height) > 0 ? Number(config.height) : 3.6;
      model.scale.multiplyScalar(desiredHeight / modelHeight);
      model.updateMatrixWorld(true);
      const normalizedBox = new THREE.Box3().setFromObject(model);
      const center = normalizedBox.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= normalizedBox.min.y;
      model.traverse(child => {
        if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
      });
      actor.add(model);
      stabilizeMotion = createMotionStabilizer(model, config);
      externalModel = model;
      demo.root.visible = false;
      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        const sourceClip = gltf.animations.find(a => a.name === config.animationName) || gltf.animations[0];
        const clip = prepareDanceClip(sourceClip, config);
        mixer.clipAction(clip).play();
        hasAnimation = true;
        canvas.dataset.animation = clip.name;
        canvas.dataset.animationDuration = String(clip.duration);
        if (reducedMotion) mixer.update(0.4);
        else mixer.update(0);
        stabilizeMotion();
      }
      canvas.dataset.model = 'custom';
    } catch (error) {
      if (error.name !== 'AbortError') console.warn('Custom model could not be loaded; demo stays active.', error);
    }
  }
  canvas.dataset.model = 'demo';
  loadCustomModel();

  const resize = () => {
    const box = canvas.parentElement.getBoundingClientRect();
    width = box.width;
    height = box.height;
    renderer.setSize(width, height, false);
    const viewHeight = width <= 700 ? 6.2 : 5.4;
    const aspect = width / Math.max(height, 1);
    camera.left = -viewHeight * aspect / 2;
    camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement);
  resize();
  const onContextLost = event => { event.preventDefault(); };
  canvas.addEventListener('webglcontextlost', onContextLost);

  function render(now) {
    if (disposed) return;
    raf = requestAnimationFrame(render);
    const delta = Math.min((now - previousTime) / 1000 || 0.016, 0.05);
    previousTime = now;
    if (document.hidden) return;
    if (!reducedMotion) time += delta;
    const storyState = getStoryState(progress);
    const { finale } = storyState;
    const mobile = width <= 700;
    const viewWidth = camera.right - camera.left;
    // A tall phone has less world-space width than a short phone. Fit the
    // dancing arm span as well as the character's height to keep hands onstage.
    const mobileDanceScale = Math.min(0.90, viewWidth * 0.25);
    const mobileLetterScale = Math.min(0.60, viewWidth * 0.21);
    const scale = mobile ? THREE.MathUtils.lerp(mobileDanceScale, mobileLetterScale, finale) : 1 - finale * 0.02;
    actor.scale.setScalar(scale);
    actor.position.x = mobile ? 0 : viewWidth * 0.255 * finale;
    actor.position.y = mobile ? -0.32 - finale * 0.05 : 0;
    actor.rotation.y = mobile ? -0.12 : -0.12 - finale * 0.14;
    actor.visible = progress >= 0.20;
    if (externalModel) {
      if (mixer && !reducedMotion) {
        mixer.update(delta);
        stabilizeMotion();
      }
      if (!hasAnimation) {
        actor.rotation.z = reducedMotion ? 0 : Math.sin(time * 3.8) * 0.055;
        actor.position.y += reducedMotion ? 0 : Math.abs(Math.sin(time * 3.8)) * 0.05;
      }
    } else {
      demo.animate(time, reducedMotion);
    }
    lighting.update(storyState, actor, width, height);
    if (progress > 0.005) renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(render);
  return {
    setProgress: value => { progress = value; },
    setReducedMotion: value => { reducedMotion = value; },
    dispose() {
      disposed = true;
      controller.abort();
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      mixer?.stopAllAction();
      lighting.dispose();
      disposeObject(scene);
      if (externalModel) disposeObject(demo.root);
      renderer.dispose();
    },
  };
}
