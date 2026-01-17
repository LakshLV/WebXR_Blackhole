import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';

/* =====================================================
   XR SETUP
===================================================== */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.xr.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
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
   CONSTANTS (PHYSICS — UNCHANGED)
===================================================== */

const G = 6.67430e-11;
const c = 299792458;
const SOLAR_MASS = 1.98847e30;

const BH_MASS = 10 * SOLAR_MASS;
const RS = (2 * G * BH_MASS) / (c * c);

const METERS_TO_VR = 1 / 5000;

/* =====================================================
   BLACK HOLE VISUAL (UNCHANGED CORE)
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
   ✨ VISUAL ADDITION 1: EVENT HORIZON GLOW
===================================================== */

scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(horizonVR * 0.9, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0x00ffaa,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
));

/* =====================================================
   ✨ VISUAL ADDITION 2: ACCRETION DISK (STATIC)
===================================================== */

const diskRadiusInner = horizonVR * 1.1;
const diskRadiusOuter = horizonVR * 3.5;

const disk = new THREE.Mesh(
  new THREE.RingGeometry(diskRadiusInner, diskRadiusOuter, 128),
  new THREE.MeshBasicMaterial({
    color: 0xffaa55,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide
  })
);

disk.rotation.x = Math.PI / 2;
scene.add(disk);

/* =====================================================
   ✨ VISUAL ADDITION 3: STARFIELD
===================================================== */

const starCount = 2000;
const starGeometry = new THREE.BufferGeometry();
const starPositions = [];

const STAR_RADIUS = 600; // safely beyond everything

for (let i = 0; i < starCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = STAR_RADIUS;

  starPositions.push(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

starGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(starPositions, 3)
);

const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.6,
    sizeAttenuation: true
  })
);

scene.add(stars);

/* =====================================================
   PLAYER
===================================================== */

function placePlayer() {
  rig.position.set(0, horizonVR * 1.1, horizonVR * 2.2);
  rig.lookAt(0, 0, 0);
}

/* =====================================================
   BODY (UNCHANGED)
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
        stretchZ: 1
      });
    }
  }
}

/* =====================================================
   PHYSICS (UNCHANGED)
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
   LOOP (PHYSICS + VISUALS)
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

    const dt = 0.0006 * c.r / Math.abs(drdt(c.r));
    const slow = THREE.MathUtils.clamp((c.r - RS) / RS, 0.02, 1);
    c.r += drdt(c.r) * dt * slow;
    c.r = Math.max(c.r, RS * 1.001);

    const tidal = tidalGradient(c.r);
    if (c.r > RS * 1.05) {
      c.stretchZ += tidal * dt * 0.001;
    }

    const maxStretch = Math.max(1, 2 * (c.r - RS) / cubeSizeVR);
    c.stretchZ = Math.min(c.stretchZ, maxStretch);

    const timeDilationFactor = Math.sqrt(Math.max(0.0001, 1 - RS / c.r));
    c.mesh.material.opacity = timeDilationFactor;

    const stretchedNearestFace = c.r - (c.stretchZ * cubeSizeVR * 0.5);
    if (timeDilationFactor < 0.2 || stretchedNearestFace < RS) {
      c.mesh.visible = false;
      c.alive = false;
      return;
    }

    const dir = c.offset.clone().normalize();
    const pos = dir.clone().multiplyScalar(c.r * METERS_TO_VR);
    c.mesh.position.copy(pos);

    c.mesh.lookAt(0, 0, 0);
    c.mesh.scale.set(1, 1, c.stretchZ);

    const inwardShift = (c.stretchZ - 1) * cubeSizeVR * 0.5;
    c.mesh.translateZ(+inwardShift);
  });

  if (alive === 0) {
    running = false;
    setTimeout(reset, 2000);
  }

  renderer.render(scene, camera);
});
