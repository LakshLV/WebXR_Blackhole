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
   CAMERA / RIG
===================================================== */

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 800);
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
   BLACK HOLE VISUAL (REFERENCE ONLY)
===================================================== */

const horizonVR = RS * METERS_TO_VR;

scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(horizonVR * 0.8, 64, 64),
  new THREE.MeshBasicMaterial({
    color: 0x00ffaa,
    wireframe: true,
    transparent: true,
    opacity: 0.4
  })
));

/* =====================================================
   PLAYER
===================================================== */

function placePlayer() {
  rig.position.set(0, horizonVR * 1.2, horizonVR * 2.2);
  rig.lookAt(0, 0, 0);
}

/* =====================================================
   INFALLING BODY (DISCRETIZED)
===================================================== */

const BODY_SIZE_METERS = 10000;
const BODY_SIZE_VR = BODY_SIZE_METERS * METERS_TO_VR;

const N = 8;
const cubeSizeVR = BODY_SIZE_VR / N;

const cubes = [];
const material = new THREE.MeshBasicMaterial({ color: 0xff4444, wireframe: true });

for (let x = 0; x < N; x++) {
  for (let y = 0; y < N; y++) {
    for (let z = 0; z < N; z++) {

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(cubeSizeVR, cubeSizeVR, cubeSizeVR),
        material
      );

      scene.add(mesh);

      const offset = new THREE.Vector3(
        (x - (N - 1) / 2) * cubeSizeVR,
        (y - (N - 1) / 2) * cubeSizeVR,
        (z - (N - 1) / 2) * cubeSizeVR
      );

      cubes.push({
        mesh,
        offset,
        r: 0,
        stretchZ: 1,
        alive: true
      });
    }
  }
}

/* =====================================================
   RESET
===================================================== */

const rStart = 5 * RS;
let running = false;

function reset() {
  cubes.forEach(c => {
    c.alive = true;
    c.r = rStart + c.offset.length() / METERS_TO_VR;
    c.stretchZ = 1;
    c.mesh.visible = true;
    c.mesh.scale.set(1, 1, 1);
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
   PHYSICS HELPERS
===================================================== */

// External observer radial speed (freezing at horizon)
function drdt_obs(r) {
  return -c * (1 - RS / r);
}

// Tidal stretch rate (∝ 1/r^3)
function tidalRate(r) {
  return (2 * G * BH_MASS) / Math.pow(r, 3);
}

/* =====================================================
   LOOP
===================================================== */

renderer.setAnimationLoop(() => {

  if (!running) {
    renderer.render(scene, camera);
    return;
  }

  let aliveCount = 0;

  cubes.forEach(c => {
    if (!c.alive) return;
    aliveCount++;

    /* ---- Time step ---- */
    const dt = 0.015;

    /* ---- Radial motion (asymptotic) ---- */
    c.r += drdt_obs(c.r) * dt;
    if (c.r < RS * 1.01) c.r = RS * 1.01;

    /* ---- Position ---- */
    const radialDir = c.offset.clone().normalize();
    const basePos = radialDir.clone().multiplyScalar(c.r * METERS_TO_VR);
    c.mesh.position.copy(basePos);

    /* ---- Orientation ---- */
    c.mesh.lookAt(0, 0, 0);

    /* ---- CONTINUOUS SPAGHETTIFICATION ---- */
    const stretchRate = tidalRate(c.r) * 0.000015;
    c.stretchZ += stretchRate * dt;

    c.mesh.scale.set(1, 1, c.stretchZ);

    // Anchor far face, pull inward face
    const shift = (c.stretchZ - 1) * cubeSizeVR * 0.5;
    c.mesh.translateZ(+shift);

    /* ---- Visual disappearance (NOT radius-based) ---- */
    if (c.stretchZ > 25) {
      c.mesh.visible = false;
      c.alive = false;
    }
  });

  if (aliveCount === 0) {
    running = false;
    setTimeout(reset, 2000);
  }

  renderer.render(scene, camera);
});
