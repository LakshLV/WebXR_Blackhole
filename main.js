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
   EVENT HORIZON (SPHERE — THIS IS THE REAL ONE)
===================================================== */

const horizonRadiusVR = blackHole.rs * METERS_TO_VR;

const horizonSphere = new THREE.Mesh(
  new THREE.SphereGeometry(horizonRadiusVR, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  })
);

scene.add(horizonSphere);

/* Optional equatorial guide ring */
const horizonRing = new THREE.Mesh(
  new THREE.TorusGeometry(horizonRadiusVR, 0.15, 16, 128),
  new THREE.MeshBasicMaterial({ color: 0x00ffff })
);
horizonRing.rotation.x = Math.PI / 2;
scene.add(horizonRing);

/* =====================================================
   PLAYER PLACEMENT
===================================================== */

function placePlayer() {
  playerRig.position.set(
    0,
    horizonRadiusVR * 1.2,
    horizonRadiusVR * 2.0
  );
  playerRig.lookAt(0, 0, 0);
}

/* =====================================================
   INFALLING CUBE (VERY LARGE)
===================================================== */

const cubeSizePhysics = 10000; // meters
const cubeSizeVR = cubeSizePhysics * METERS_TO_VR;

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(cubeSizeVR, cubeSizeVR, cubeSizeVR),
  new THREE.MeshBasicMaterial({
    color: 0xff3333,
    wireframe: true
  })
);

scene.add(cube);

/* =====================================================
   PHYSICS STATE
===================================================== */

const rStart = 4 * blackHole.rs;
let r, tau;
let resetting = false;

/* =====================================================
   RESET
===================================================== */

function resetSimulation() {
  r = rStart;
  tau = 0;

  // Place cube radially offset
  const startRadiusVR = r * METERS_TO_VR;
  cube.position.set(startRadiusVR, 0, 0);
  cube.scale.set(1, 1, 1);
  cube.visible = true;

  resetting = false;
  console.log("Cube reset");
}

/* =====================================================
   XR EVENTS
===================================================== */

renderer.xr.addEventListener('sessionstart', () => {
  placePlayer();
  resetSimulation();
});

renderer.xr.addEventListener('sessionend', () => {
  resetting = true;
});

/* =====================================================
   PHYSICS
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

  if (!resetting && r > blackHole.rs) {

    const dTau = deltaTau(r);
    r += drdTau(r) * dTau;
    tau += dTau;

    // ---- RADIAL POSITION ----
    const radiusVR = r * METERS_TO_VR;
    cube.position.set(radiusVR, 0, 0);

    // ---- SPAGHETTIFICATION ----
    if (r < 3 * blackHole.rs) {
      const stretch = 1 + tidalAcceleration(r) / 800;

      cube.scale.set(
        stretch,
        1 / Math.sqrt(stretch),
        1 / Math.sqrt(stretch)
      );
    }

    // ---- EVENT HORIZON CUTOFF ----
    if (r <= blackHole.rs) {
      cube.visible = false;
      resetting = true;
      setTimeout(resetSimulation, 1500);
    }
  }

  renderer.render(scene, camera);
});
