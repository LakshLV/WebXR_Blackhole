import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';

// =========================
// BASIC XR SETUP
// =========================

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.xr.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// XR rig
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

// =========================
// CONSTANTS (SI)
// =========================

const G = 6.67430e-11;
const c = 299792458;
const SOLAR_MASS = 1.98847e30;

// =========================
// BLACK HOLE (10 SOLAR MASSES)
// =========================

const blackHole = {
  massKg: 10 * SOLAR_MASS,
  rs: null
};

blackHole.rs = (2 * G * blackHole.massKg) / (c * c);

// =========================
// VISUAL SCALE
// =========================

// 1 VR meter = 1,000 physics meters
const METERS_TO_VR = 1 / 1000;

// =========================
// EVENT HORIZON (VISIBLE)
// =========================

const horizonRadiusVR = blackHole.rs * METERS_TO_VR;

const horizon = new THREE.Mesh(
  new THREE.TorusGeometry(horizonRadiusVR, 0.25, 16, 128),
  new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true
  })
);

horizon.rotation.x = Math.PI / 2;
scene.add(horizon);

// =========================
// PLAYER — ABOVE, LOOKING DOWN
// =========================

playerRig.position.set(0, horizonRadiusVR * 3, 0);
playerRig.lookAt(0, 0, 0);

renderer.xr.addEventListener('sessionstart', () => {
  playerRig.position.set(0, horizonRadiusVR * 3, 0);
  playerRig.lookAt(0, 0, 0);
});

// =========================
// FALLING CUBE (BIG ENOUGH TO SEE)
// =========================

const cubeSizePhysics = 50; // meters
const cubeSizeVR = cubeSizePhysics * METERS_TO_VR;

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(cubeSizeVR, cubeSizeVR, cubeSizeVR),
  new THREE.MeshBasicMaterial({
    color: 0xff3333,
    wireframe: true
  })
);

scene.add(cube);

// =========================
// PHYSICS STATE
// =========================

// Start close enough to see motion
let r = 6 * blackHole.rs;
let tau = 0;

// =========================
// PHYSICS FUNCTIONS
// =========================

// Proper-time radial free fall
function drdTau(r) {
  return -c * Math.sqrt(blackHole.rs / r);
}

// Adaptive timestep
function deltaTau(r) {
  return 1e-3 * r / Math.abs(drdTau(r));
}

// Tidal acceleration across cube
function tidalAcceleration(r) {
  return (2 * G * blackHole.massKg / Math.pow(r, 3)) * cubeSizePhysics;
}

// =========================
// VISUAL MAPPING (THE MAGIC)
// =========================

// Log compression so motion is visible
function visualDepth(r) {
  const x = Math.max(r / blackHole.rs - 1, 0.0001);
  return -Math.log(x) * 2; // tunable drama knob
}

// =========================
// LOOP
// =========================

renderer.setAnimationLoop(() => {
  if (r > blackHole.rs * 1.001) {
    const dTau = deltaTau(r);
    r += drdTau(r) * dTau;
    tau += dTau;
  }

  // VISUAL POSITION
  const z = visualDepth(r);
  cube.position.set(0, 0, z);

  // SPAGHETTIFICATION (only near horizon)
  const aTidal = tidalAcceleration(r);
  const stretch = THREE.MathUtils.clamp(1 + aTidal / 15, 1, 20);

  cube.scale.set(
    1 / Math.sqrt(stretch),
    stretch,
    1 / Math.sqrt(stretch)
  );

  console.log({
    r_rs: (r / blackHole.rs).toFixed(3),
    stretch: stretch.toFixed(2),
    tau: tau.toFixed(2)
  });

  renderer.render(scene, camera);
});
