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
   EVENT HORIZON (SPHERE)
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
   SEGMENTED INFALL OBJECT
===================================================== */

const segmentCount = 20;
const cubeSizePhysics = 10000; // meters
const cubeSizeVR = cubeSizePhysics * METERS_TO_VR;
const segmentLengthVR = cubeSizeVR / segmentCount;

const segmentMaterial = new THREE.MeshBasicMaterial({
  color: 0xff4444
});

const segments = [];

for (let i = 0; i < segmentCount; i++) {
  const seg = new THREE.Mesh(
    new THREE.BoxGeometry(
      segmentLengthVR,
      segmentLengthVR,
      segmentLengthVR
    ),
    segmentMaterial
  );
  scene.add(seg);
  segments.push(seg);
}

/* =====================================================
   PHYSICS STATE
===================================================== */

const rStart = 4 * blackHole.rs;
let r, tau;
let running = false;

/* =====================================================
   RESET
===================================================== */

function resetSimulation() {
  r = rStart;
  tau = 0;

  const baseRadiusVR = r * METERS_TO_VR;

  for (let i = 0; i < segmentCount; i++) {
    segments[i].position.set(
      baseRadiusVR + i * segmentLengthVR,
      0,
      0
    );
    segments[i].scale.set(1, 1, 1);
    segments[i].visible = true;
  }

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

  if (running && r > blackHole.rs) {

    const dTau = deltaTau(r);
    r += drdTau(r) * dTau;
    tau += dTau;

    const baseRadiusVR = r * METERS_TO_VR;

    for (let i = 0; i < segmentCount; i++) {
      const localR = r + i * cubeSizePhysics / segmentCount;

      const stretch = THREE.MathUtils.clamp(
        1 + tidalAcceleration(localR) / 1200,
        1,
        6
      );

      segments[i].position.set(
        baseRadiusVR + i * segmentLengthVR,
        0,
        0
      );

      segments[i].scale.set(
        stretch,
        1 / Math.sqrt(stretch),
        1 / Math.sqrt(stretch)
      );
    }

    if (r <= blackHole.rs) {
      segments.forEach(s => s.visible = false);
      running = false;
      setTimeout(resetSimulation, 1500);
    }
  }

  renderer.render(scene, camera);
});
