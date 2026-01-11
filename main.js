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

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
scene.add(camera);

// =========================
// CONSTANTS (SI UNITS)
// =========================

const G = 6.67430e-11;
const c = 299792458;
const SOLAR_MASS = 1.98847e30;

// =========================
// BLACK HOLE (STELLAR MASS)
// =========================

const blackHole = {
  massSolar: 10,
  massKg: null,
  rs: null
};

blackHole.massKg = blackHole.massSolar * SOLAR_MASS;
blackHole.rs = (2 * G * blackHole.massKg) / (c * c);

// =========================
// VISUAL SCALE
// =========================

// 1 VR meter = 1000 physics meters
const METERS_TO_VR = 1 / 1000;

// =========================
// EVENT HORIZON
// =========================

const horizonRadiusVR = blackHole.rs * METERS_TO_VR;

const horizon = new THREE.Mesh(
  new THREE.RingGeometry(horizonRadiusVR * 0.98, horizonRadiusVR * 1.02, 128),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide })
);

horizon.rotation.x = Math.PI / 2;
horizon.position.z = 0;
scene.add(horizon);

// =========================
// PLAYER (EXTERNAL OBSERVER)
// =========================

// Player at 10 r_s
const PLAYER_RS = 10;
const playerRadiusPhysics = PLAYER_RS * blackHole.rs;
const playerRadiusVR = playerRadiusPhysics * METERS_TO_VR;

// Player looks inward along -Z
camera.position.set(0, 1.6, playerRadiusVR);
camera.lookAt(0, 0, 0);

// =========================
// CUBE (INFALLING TEST MASS)
// =========================

const cubeSizePhysics = 1; // meters
const cubeSizeVR = cubeSizePhysics * METERS_TO_VR;

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(cubeSizeVR, cubeSizeVR, cubeSizeVR),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);

scene.add(cube);

// Initial cube position: 20 r_s
let r = 20 * blackHole.rs;
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
  return 1e-3 * r / Math.abs(drdTau(r));
}

// Tidal acceleration
function tidalAcceleration(r) {
  return (2 * G * blackHole.massKg / Math.pow(r, 3)) * cubeSizePhysics;
}

// =========================
// ANIMATION LOOP
// =========================

renderer.setAnimationLoop(() => {
  if (r > blackHole.rs) {
    const dTau = deltaTau(r);
    r += drdTau(r) * dTau;
    tau += dTau;

    // Position cube between player and horizon
    cube.position.z = r * METERS_TO_VR;

    // Spaghettification
    const aTidal = tidalAcceleration(r);
    const stretch = 1 + aTidal / 20; // visible but physical

    cube.scale.set(
      1 / Math.sqrt(stretch),
      stretch,
      1 / Math.sqrt(stretch)
    );

    console.log({
      r_rs: (r / blackHole.rs).toFixed(3),
      a_tidal: aTidal.toFixed(2),
      tau: tau.toFixed(2)
    });
  }

  renderer.render(scene, camera);
});
