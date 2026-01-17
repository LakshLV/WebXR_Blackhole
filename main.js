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
   BLACK HOLE VISUAL
===================================================== */

const horizonVR = RS * METERS_TO_VR;

scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(horizonVR * 0.7, 48, 48),
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
  rig.position.set(0, horizonVR * 1.1, horizonVR * 2.2);
  rig.lookAt(0, 0, 0);
}

/* =====================================================
   BODY (MANY CUBES)
===================================================== */

const BODY_SIZE_METERS = 10000;
const BODY_SIZE_VR = BODY_SIZE_METERS * METERS_TO_VR;

const N = 8;
const cubeSizeVR = BODY_SIZE_VR / N;

const cubes = [];
const material = new THREE.MeshBasicMaterial({ 
  color: 0xff5555, 
  wireframe: true,
  transparent: true,
  opacity: 1.0
});

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
        alive: true,
        stretchZ: 1   // ACCUMULATED stretch
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

function tidalGradient(r) {
  return (2 * G * BH_MASS) / Math.pow(r, 3);
}

/* =====================================================
   RESET
===================================================== */

const rStart = 4.5 * RS;
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

    /* ---- Proper time step ---- */
    const dt = 0.0006 * c.r / Math.abs(drdt(c.r));

    /* ---- Radial motion (asymptotic slowdown) ---- */
    const slow = THREE.MathUtils.clamp((c.r - RS) / RS, 0.02, 1);
    c.r += drdt(c.r) * dt * slow;

    /* ---- Hard clamp: cube center cannot go below event horizon ---- */
    c.r = Math.max(c.r, RS * 1.001);

    /* ---- Continuous spaghettification ---- */
    const tidal = tidalGradient(c.r);

    // Accumulate stretch, but cap it so nearest face never crosses event horizon
    if (c.r > RS * 1.05) {
      c.stretchZ += tidal * dt * 0.001;
    }
    
    // HARD LIMIT: Ensure nearest face never goes past the event horizon
    // stretchedNearestFace = c.r - (c.stretchZ * cubeSizeVR / 2) >= RS
    // Therefore: c.stretchZ <= 2 * (c.r - RS) / cubeSizeVR
    const maxStretch = Math.max(1, 2 * (c.r - RS) / cubeSizeVR);
    c.stretchZ = Math.min(c.stretchZ, maxStretch);

    /* ---- Gravitational redshift & time dilation fade ---- */
    // Physical redshift factor: sqrt(1 - RS/r)
    // As object approaches horizon, redshift increases and light becomes dimmer
    const timeDilationFactor = Math.sqrt(Math.max(0.0001, 1 - RS / c.r));
    
    // Opacity fades proportionally to time dilation
    // Object becomes invisible before reaching event horizon
    const opacity = Math.max(0, timeDilationFactor);
    c.mesh.material.opacity = opacity;
    
    /* ---- Check if stretched cube's nearest face crossed the horizon ---- */
    // The cube's nearest face (when stretched) is at distance r - (stretchZ * cubeSizeVR / 2)
    const stretchedNearestFace = c.r - (c.stretchZ * cubeSizeVR * 0.5);
    
    /* ---- Remove when absorbed by black hole ---- */
    // Remove if: time dilation is negligible OR stretched face crossed event horizon
    if (timeDilationFactor < 0.2 || stretchedNearestFace < RS) {
      c.mesh.visible = false;
      c.alive = false;
      return;
    }

    /* ---- Position ---- */
    const dir = c.offset.clone().normalize();
    const pos = dir.clone().multiplyScalar(c.r * METERS_TO_VR);
    c.mesh.position.copy(pos);

    /* ---- Orientation ---- */
    c.mesh.lookAt(0, 0, 0);

    /* ---- Apply stretch inward ---- */
    c.mesh.scale.set(1, 1, c.stretchZ);

    // Anchor far face permanently
    const inwardShift = (c.stretchZ - 1) * cubeSizeVR * 0.5;
    c.mesh.translateZ(+inwardShift);
  });

  if (alive === 0) {
    running = false;
    setTimeout(reset, 2000);
  }

  renderer.render(scene, camera);
});
 