import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';

/* =====================================================
   XR SETUP
===================================================== */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.xr.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

/* =====================================================
   CAMERA / PLAYER
===================================================== */

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

/* =====================================================
   CONSTANTS
===================================================== */

const G = 6.67430e-11;
const c = 299792458;
const SOLAR_MASS = 1.98847e30;

const BH_MASS = 10 * SOLAR_MASS;
const RS = (2 * G * BH_MASS) / (c * c);

const METERS_TO_VR = 1 / 5000;

/* =====================================================
   BLACK HOLE VISUAL
===================================================== */

const horizonVR = RS * METERS_TO_VR;

scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(horizonVR, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0x00ff88,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  })
));

/* =====================================================
   PLAYER POSITION
===================================================== */

function placePlayer() {
  rig.position.set(0, horizonVR * 1.3, horizonVR * 2.4);
  rig.lookAt(0, 0, 0);
}

/* =====================================================
   SEGMENTED BODY (125 PERFECT CUBES)
===================================================== */

const bodySizeMeters = 10000;
const bodySizeVR = bodySizeMeters * METERS_TO_VR;

const N = 5;
const cubeSizeVR = bodySizeVR / N;

const cubes = [];
const material = new THREE.MeshBasicMaterial({ color: 0xff4444 });

for (let x = 0; x < N; x++) {
  for (let y = 0; y < N; y++) {
    for (let z = 0; z < N; z++) {

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(cubeSizeVR, cubeSizeVR, cubeSizeVR),
        material
      );

      scene.add(mesh);

      cubes.push({
        mesh,
        localOffset: new THREE.Vector3(
          (x - (N - 1) / 2) * cubeSizeVR,
          (y - (N - 1) / 2) * cubeSizeVR,
          (z - (N - 1) / 2) * cubeSizeVR
        ),
        r: 0,
        alive: true
      });
    }
  }
}

/* =====================================================
   PHYSICS
===================================================== */

function drdt(r) {
  return -c * Math.sqrt(RS / r);
}

function tidalStretch(r) {
  return (2 * G * BH_MASS / (r ** 3)) * bodySizeMeters;
}

/* =====================================================
   RESET
===================================================== */

const rStart = 4 * RS;
let running = false;

function reset() {
  cubes.forEach(c => {
    c.alive = true;
    c.r = rStart + c.localOffset.length() / METERS_TO_VR;
    c.mesh.visible = true;
  });
  running = true;
}

/* =====================================================
   XR EVENTS
===================================================== */

renderer.xr.addEventListener('sessionstart', () => {
  placePlayer();
  reset();
});

/* =====================================================
   LOOP
===================================================== */

renderer.setAnimationLoop(() => {

  if (!running) {
    renderer.render(scene, camera);
    return;
  }

  let alive = 0;

  cubes.forEach(c => {
    if (!c.alive) return;
    alive++;

    const dt = 0.0005 * c.r / Math.abs(drdt(c.r));
    c.r += drdt(c.r) * dt;

    if (c.r <= RS) {
      c.mesh.visible = false;
      c.alive = false;
      return;
    }

    const radialDir = c.localOffset.clone().normalize();

    /* Base center-of-mass position */
    const basePos = radialDir.clone().multiplyScalar(c.r * METERS_TO_VR);

    /* Stretch only toward black hole */
    const stretch = THREE.MathUtils.clamp(
      tidalStretch(c.r) / 1200,
      0,
      cubeSizeVR * 6
    );

    const depthFactor = -c.localOffset.clone().normalize().dot(radialDir);

    const visualOffset = radialDir.clone().multiplyScalar(stretch * depthFactor);

    c.mesh.position.copy(basePos.add(visualOffset));
  });

  if (alive === 0) {
    running = false;
    setTimeout(reset, 1500);
  }

  renderer.render(scene, camera);
});
