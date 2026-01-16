import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';

/* =====================================================
   BASIC XR SETUP
===================================================== */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.xr.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

/* =====================================================
   PLAYER
===================================================== */

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

/* =====================================================
   CONSTANTS
===================================================== */

const G = 6.67430e-11;
const c = 299792458;
const SOLAR_MASS = 1.98847e30;

/* =====================================================
   BLACK HOLE
===================================================== */

const blackHole = {
  massKg: 10 * SOLAR_MASS,
  rs: (2 * G * 10 * SOLAR_MASS) / (c * c)
};

/* =====================================================
   SCALE
===================================================== */

const METERS_TO_VR = 1 / 5000;

/* =====================================================
   EVENT HORIZON VISUAL (SPHERE)
===================================================== */

const horizonRadiusVR = blackHole.rs * METERS_TO_VR;

const horizonSphere = new THREE.Mesh(
  new THREE.SphereGeometry(horizonRadiusVR * 0.95, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  })
);
scene.add(horizonSphere);

/* =====================================================
   PLAYER POSITION
===================================================== */

function placePlayer() {
  playerRig.position.set(
    0,
    horizonRadiusVR * 1.1,
    horizonRadiusVR * 2.0
  );
  playerRig.lookAt(0, 0, 0);
}

/* =====================================================
   SEGMENTED CUBE (3D GRID)
===================================================== */

const cubeSizePhysics = 10000; // meters (confirmed good)
const cubeSizeVR = cubeSizePhysics * METERS_TO_VR;

const gridN = 4; // 4×4×4 = 64 mini-cubes (Quest-safe)
const miniSizeVR = cubeSizeVR / gridN;

const miniMaterial = new THREE.MeshBasicMaterial({
  color: 0xff4444
});

const miniCubes = [];

for (let x = 0; x < gridN; x++) {
  for (let y = 0; y < gridN; y++) {
    for (let z = 0; z < gridN; z++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(miniSizeVR, miniSizeVR, miniSizeVR),
        miniMaterial
      );
      scene.add(m);
      miniCubes.push({
        mesh: m,
        offset: new THREE.Vector3(
          (x - (gridN - 1) / 2) * miniSizeVR,
          (y - (gridN - 1) / 2) * miniSizeVR,
          (z - (gridN - 1) / 2) * miniSizeVR
        ),
        alive: true
      });
    }
  }
}

/* =====================================================
   PHYSICS STATE
===================================================== */

const rStart = 4 * blackHole.rs;
let r;
let running = false;

/* =====================================================
   RESET
===================================================== */

function resetSimulation() {
  r = rStart;

  const baseRadiusVR = r * METERS_TO_VR;

  miniCubes.forEach(c => {
    c.alive = true;
    c.mesh.visible = true;
    c.mesh.scale.set(1, 1, 1);
    c.mesh.position.copy(c.offset).add(new THREE.Vector3(baseRadiusVR, 0, 0));
  });

  running = true;
}

/* =====================================================
   XR EVENTS
===================================================== */

renderer.xr.addEventListener('sessionstart', () => {
  placePlayer();
  resetSimulation();
});

renderer.xr.addEventListener('sessionend', () => {
  running = false;
});

/* =====================================================
   PHYSICS FUNCTIONS
===================================================== */

function drdTau(r) {
  return -c * Math.sqrt(blackHole.rs / r);
}

function deltaTau(r) {
  return 5e-4 * r / Math.abs(drdTau(r));
}

function tidalAcceleration(r) {
  return (2 * G * blackHole.massKg / Math.pow(r, 3)) * cubeSizePhysics;
}

/* =====================================================
   LOOP
===================================================== */

renderer.setAnimationLoop(() => {

  if (running && r > blackHole.rs) {

    const dTau = deltaTau(r);
    r += drdTau(r) * dTau;

    const baseRadiusVR = r * METERS_TO_VR;

    const proximity = THREE.MathUtils.clamp(
      1 - (r - blackHole.rs) / (2 * blackHole.rs),
      0,
      1
    );

    const stretchFactor = 1 + proximity * proximity * 8;

    miniCubes.forEach(c => {
      if (!c.alive) return;

      const localR = r + c.offset.x / METERS_TO_VR;

      if (localR <= blackHole.rs) {
        c.alive = false;
        c.mesh.visible = false;
        return;
      }

      // Radial fall (slows visually near horizon)
      const slowDown = 1 - proximity * 0.85;

      c.mesh.position.set(
        baseRadiusVR * slowDown,
        0,
        0
      ).add(c.offset.clone().multiplyScalar(stretchFactor));

      // Spaghettification
      c.mesh.scale.set(
        stretchFactor,
        1 / Math.sqrt(stretchFactor),
        1 / Math.sqrt(stretchFactor)
      );
    });

    if (miniCubes.every(c => !c.alive)) {
      running = false;
      setTimeout(resetSimulation, 1500);
    }
  }

  renderer.render(scene, camera);
});
