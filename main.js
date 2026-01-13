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
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
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
// BLACK HOLE (STELLAR MASS)
// =========================

const blackHole = {
  massSolar: 10,
  massKg: 10 * SOLAR_MASS,
  rs: null
};

blackHole.rs = (2 * G * blackHole.massKg) / (c * c);

// =========================
// VISUAL SCALE (INTENTIONALLY CLOSE)
// =========================

// 1 VR meter = 5,000 physics meters
const METERS_TO_VR = 1 / 5000;

// =========================
// EVENT HORIZON (CLEAR & LARGE)
// =========================

const horizonRadiusVR = blackHole.rs * METERS_TO_VR;

const horizon = new THREE.Mesh(
  new THREE.TorusGeometry(horizonRadiusVR, 0.3, 16, 128),
  new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true
  })
);

horizon.rotation.x = Math.PI / 2;
scene.add(horizon);

// =========================
// PLAYER — DIRECTLY ABOVE
// =========================

// Player floats above the black hole, looking down
playerRig.position.set(0, horizonRadiusVR * 2, 0);
playerRig.lookAt(0, 0, 0);

renderer.xr.addEventListener('sessionstart', () => {
  playerRig.position.set(0, horizonRadiusVR * 2, 0);
  playerRig.lookAt(0, 0, 0);
});

// =========================
// LARGE CUBE (100 m)
// =========================

const cubeSizePhysics = 100; // meters
const cubeSizeVR = cubeSizePhysics * METERS_TO_VR;

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(cubeSizeVR, cubeSizeVR, cubeSizeVR),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);

scene.add(cube);

// Initial physics state
let r = 1.3 * blackHole.rs;
let tau = 0;

// =========================
// PHYSICS FUNCTIONS
// =========================

// dr/dτ = -c sqrt(rs / r)
function drdTau(r) {
  return -c * Math.sqrt(blackHole.rs / r);
}

// Adaptive timestep
function deltaTau(r) {
  return 5e-4 * r / Math.abs(drdTau(r));
}

// Tidal acceleration
function tidalAcceleration(r) {
  return (2 * G * blackHole.massKg / Math.pow(r, 3)) * cubeSizePhysics;
}

// =========================
// LOOP
// =========================

renderer.setAnimationLoop(() => {
  if (r > blackHole.rs) {
    const dTau = deltaTau(r);
    r += drdTau(r) * dTau;
    tau += dTau;

    // Cube falls straight down toward center
    cube.position.y = r * METERS_TO_VR;

    // Spaghettification (radial stretch)
    const aTidal = tidalAcceleration(r);
    const stretch = 1 + aTidal / 5;

    cube.scale.set(
      1 / Math.sqrt(stretch),
      stretch,
      1 / Math.sqrt(stretch)
    );

    console.log({
      r_rs: (r / blackHole.rs).toFixed(3),
      a_tidal: aTidal.toFixed(1),
      tau: tau.toFixed(2)
    });
  }

  renderer.render(scene, camera);
});
