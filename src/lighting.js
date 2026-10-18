import * as THREE from 'three';

export function createStageLighting(scene) {
  const ambient = new THREE.HemisphereLight(0xffefd6, 0x4c2430, 0.15);
  const key = new THREE.DirectionalLight(0xffddb1, 0);
  key.position.set(-3.5, 7, 5);
  const rim = new THREE.DirectionalLight(0xffb35c, 0);
  rim.position.set(4, 5, -3);
  const fill = new THREE.DirectionalLight(0xe4eaff, 0);
  fill.position.set(1, 2, 5);
  const spot = new THREE.SpotLight(0xffe0a9, 0, 16, 0.38, 0.7, 1.8);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0002;
  spot.shadow.normalBias = 0.035;
  spot.shadow.radius = 4;
  scene.add(ambient, key, rim, fill, spot, spot.target);

  // A faint 3D volume makes the warm spotlight visible in the stage air.
  // It follows the same source and target as the light on the actual model.
  const beamMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uStrength: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uStrength;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float facing = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.4);
        float ends = smoothstep(0.0, 0.16, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
        gl_FragColor = vec4(1.0, 0.77, 0.42, uStrength * facing * ends);
      }`,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 1.9, 1, 48, 1, true), beamMaterial);
  beam.renderOrder = 2;
  scene.add(beam);
  const beamStart = new THREE.Vector3();
  const beamEnd = new THREE.Vector3();
  const beamAxis = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  // Reuse the real bulbs in the background image. This additive pass extracts
  // their highlights, so the garland can light from left to right without
  // inventing a second set of bulbs or changing the existing art.
  const loader = new THREE.TextureLoader();
  // All textures are same-origin; match CSS image/preload request credentials.
  loader.setCrossOrigin(undefined);
  const textures = [
    '/assets/celebration-stage-v2.webp',
    '/assets/celebration-mobile-v2.webp',
    '/assets/celebration-mobile.webp',
  ].map(url => {
    const texture = loader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
  const fairyMaterial = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uDesktop: { value: textures[0] }, uMobile: { value: textures[1] },
      uLetter: { value: textures[2] }, uAspect: { value: 1.6 },
      uPhone: { value: 0 }, uFinale: { value: 0 }, uOn: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uDesktop, uMobile, uLetter;
      uniform float uAspect, uPhone, uFinale, uOn;
      varying vec2 vUv;
      vec2 coverUv(float imageAspect) {
        vec2 scale = vec2(min(1.0, uAspect / imageAspect), min(1.0, imageAspect / uAspect));
        return (vUv - 0.5) * scale + 0.5;
      }
      void main() {
        vec3 desktop = texture2D(uDesktop, coverUv(1672.0 / 941.0)).rgb;
        vec2 phoneUv = coverUv(941.0 / 1672.0);
        vec3 phone = mix(texture2D(uMobile, phoneUv).rgb, texture2D(uLetter, phoneUv).rgb, uFinale);
        vec3 color = mix(desktop, phone, uPhone);
        float brightness = max(color.r, max(color.g, color.b));
        float bulbs = smoothstep(0.52, 0.95, brightness);
        float top = smoothstep(0.82, 0.94, vUv.y);
        float sweep = smoothstep(vUv.x - 0.06, vUv.x + 0.06, uOn * 1.16 - 0.08);
        gl_FragColor = vec4(color, bulbs * top * sweep * 0.75);
        #include <colorspace_fragment>
      }`,
  });
  const fairyGlow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fairyMaterial);
  fairyGlow.frustumCulled = false;
  fairyGlow.renderOrder = 3;
  scene.add(fairyGlow);

  return {
    update(state, actor, width, height) {
      const on = state.spotlight;
      ambient.intensity = 0.12 + state.ambient * 0.35 + on * 1.1;
      key.intensity = 0.05 + on * 1.4;
      rim.intensity = state.ambient * 0.08 + on * 1.7;
      fill.intensity = 0.03 + on * 0.35;
      spot.intensity = on * 42;
      spot.position.set(actor.position.x - 0.65, 6.2, 3.4);
      spot.target.position.set(actor.position.x, 1.65 * actor.scale.y + actor.position.y, 0);
      beamStart.copy(spot.position);
      beamEnd.set(actor.position.x, 0.05 + actor.position.y, 0);
      beamAxis.subVectors(beamStart, beamEnd);
      beam.position.copy(beamStart).add(beamEnd).multiplyScalar(0.5);
      beam.scale.set(actor.scale.x, beamAxis.length(), actor.scale.z);
      beam.quaternion.setFromUnitVectors(up, beamAxis.normalize());
      beamMaterial.uniforms.uStrength.value = on * 0.045;
      beam.visible = on > 0.001;
      fairyMaterial.uniforms.uAspect.value = width / Math.max(height, 1);
      fairyMaterial.uniforms.uPhone.value = width <= 700 ? 1 : 0;
      fairyMaterial.uniforms.uFinale.value = state.finale;
      fairyMaterial.uniforms.uOn.value = state.garlands;
    },
    dispose() {
      textures.forEach(texture => texture.dispose());
      spot.shadow.dispose();
    },
  };
}
