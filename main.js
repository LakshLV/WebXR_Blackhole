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

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);
const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

/* =====================================================
   DEBUG
===================================================== */

scene.add(new THREE.AxesHelper(5));

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
  rs: null
};

blackHole.rs = (2 * G * blackHole.massKg) / (c * c);

/* =====================================================
   SCALE
===================================================== */

const METERS_TO_VR = 1 / 5000;

/* =====================================================
   EVENT HORIZON
===================================================== */

const horizonRadiusVR = blackHole.rs * METERS_TO_VR;

const horizon = new THREE.Mesh(
  new THREE.TorusGeometry(horizonRadiusVR, 0.3, 16, 128),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
);

horizon.rotation.x = Math.PI / 2;
scene.add(horizon);

/* =====================================================
   PLAYER PLACEMENT (SIDE-ON VIEW)
===================================================== */

function placePlayer() {
  playerRig.position.set(
    0,
    horizonRadiusVR * 1.5,
    horizonRadiusVR * 4
  );
  playerRig.lookAt(0, 0, 0);
}

/* =====================================================
   CUBE
===================================================== */

const cubeSizePhysics = 10000;
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
const lateralOffset = 1.2 * blackHole.rs * METERS_TO_VR;

let r, tau, visualFall;
let resetting = false;

/* =====================================================
   RESET FUNCTION
===================================================== */

function resetSimulation() {
  r = rStart;
  tau = 0;
  visualFall = 0;
  resetting = false;

  cube.visible = true;
  cube.scale.set(1, 1, 1);

  cube.position.set(
    lateralOffset,
    horizonRadiusVR * 2,
    0
  );
}

/* =====================================================
   XR CONTROL
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

    const proximity = THREE.MathUtils.clamp(
      1 - (r - blackHole.rs) / (5 * blackHole.rs),
      0,
      1
    );

    visualFall += 0.003 + proximity * 0.025;
    cube.position.y -= visualFall;

    if (r < 2.5 * blackHole.rs) {
      const stretch = 1 + tidalAcceleration(r) / 250;

      cube.scale.set(
        1 / Math.sqrt(stretch),
        stretch,
        1 / Math.sqrt(stretch)
      );
    }

    // HARD EVENT HORIZON CUTOFF
    if (r <= blackHole.rs) {
      cube.visible = false;
      resetting = true;

      setTimeout(resetSimulation, 1000);
    }
  }

  renderer.render(scene, camera);
});
