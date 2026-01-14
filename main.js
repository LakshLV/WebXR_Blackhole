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
   PLAYER (EXTERNAL OBSERVER)
===================================================== */

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

/* =====================================================
   DEBUG REFERENCES
===================================================== */

scene.add(new THREE.GridHelper(30, 30));
scene.add(new THREE.AxesHelper(5));

/* =====================================================
   PHYSICAL CONSTANTS (SI)
===================================================== */

const G = 6.67430e-11;
const c = 299792458;
const SOLAR_MASS = 1.98847e30;

/* =====================================================
   BLACK HOLE PARAMETERS
===================================================== */

const blackHole = {
  massSolar: 10,
  massKg: 10 * SOLAR_MASS,
  rs: null
};

// Schwarzschild radius r_s = 2GM / c^2
blackHole.rs = (2 * G * blackHole.massKg) / (c * c);

/* =====================================================
   VISUAL SCALE
===================================================== */

// 1 VR meter = 5 km (visual only)
const METERS_TO_VR = 1 / 5000;

/* =====================================================
   EVENT HORIZON VISUAL
===================================================== */

const horizonRadiusVR = blackHole.rs * METERS_TO_VR;

const horizon = new THREE.Mesh(
  new THREE.TorusGeometry(horizonRadiusVR, 0.3, 16, 128),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
);

horizon.rotation.x = Math.PI / 2;
scene.add(horizon);

/* =====================================================
   PLAYER POSITION
===================================================== */

function placePlayer() {
  playerRig.position.set(0, horizonRadiusVR * 3, 0);
  playerRig.lookAt(0, 0, 0);
}
placePlayer();

/* =====================================================
   INFALLING CUBE
===================================================== */

const cubeSizePhysics = 50; // meters (large for visibility)
const cubeSizeVR = cubeSizePhysics * METERS_TO_VR;

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(cubeSizeVR, cubeSizeVR, cubeSizeVR),
  new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
);

scene.add(cube);

/* =====================================================
   PHYSICS STATE
===================================================== */

const rStart = 6 * blackHole.rs;

let r = rStart;
let tau = 0;
let visualFall = 0;

/* =====================================================
   SIMULATION CONTROL
===================================================== */

let simulationRunning = false;

renderer.xr.addEventListener('sessionstart', () => {
  simulationRunning = true;

  r = rStart;
  tau = 0;
  visualFall = 0;

  cube.visible = true;
  cube.scale.set(1, 1, 1);
  cube.position.set(0, horizonRadiusVR * 1.8, 0);

  placePlayer();
});

renderer.xr.addEventListener('sessionend', () => {
  simulationRunning = false;
});

/* =====================================================
   SCHWARZSCHILD FREE FALL
===================================================== */

// dr/dτ = -c sqrt(r_s / r)
function drdTau(r) {
  return -c * Math.sqrt(blackHole.rs / r);
}

// Adaptive proper-time step
function deltaTau(r) {
  return 5e-4 * r / Math.abs(drdTau(r));
}

/* =====================================================
   TIDAL ACCELERATION
===================================================== */

function tidalAcceleration(r) {
  return (2 * G * blackHole.massKg / Math.pow(r, 3)) * cubeSizePhysics;
}

/* =====================================================
   RENDER LOOP
===================================================== */

renderer.setAnimationLoop(() => {

  if (simulationRunning && r > blackHole.rs) {

    // ---- Physics update (truth) ----
    const dTau = deltaTau(r);
    r += drdTau(r) * dTau;
    tau += dTau;

    // ---- Visual fall (perceptual) ----
    const proximity = THREE.MathUtils.clamp(
      1 - (r - blackHole.rs) / (5 * blackHole.rs),
      0,
      1
    );

    visualFall += 0.002 + proximity * 0.02;
    cube.position.y -= visualFall;

    // ---- Spaghettification (late, gated) ----
    let stretch = 1;
    if (r < 2.5 * blackHole.rs) {
      stretch = 1 + tidalAcceleration(r) / 200;
    }

    cube.scale.set(
      1 / Math.sqrt(stretch),
      stretch,
      1 / Math.sqrt(stretch)
    );

    cube.position.y -= (stretch - 1) * cubeSizeVR * 0.5;

    // ---- Horizon cutoff (EXTERNAL OBSERVER RULE) ----
    if (r <= blackHole.rs) {
      cube.visible = false;
      simulationRunning = false;

      console.log("Horizon reached — simulation reset");
    }
  }

  renderer.render(scene, camera);
});
