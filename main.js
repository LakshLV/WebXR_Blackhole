import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';

/* ================= XR ================= */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.xr.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

/* ================= CAMERA ================= */

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 800);
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

/* ================= CONSTANTS ================= */

const G = 6.67430e-11;
const c = 299792458;
const SOLAR_MASS = 1.98847e30;

const BH_MASS = 10 * SOLAR_MASS;
const RS = (2 * G * BH_MASS) / (c * c);

const METERS_TO_VR = 1 / 5000;

/* ================= BLACK HOLE ================= */

const horizonVR = RS * METERS_TO_VR;

scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(horizonVR * 0.8, 64, 64),
  new THREE.MeshBasicMaterial({
    color: 0x00ffaa,
    wireframe: true,
    transparent: true,
    opacity: 0.4
  })
));

/* ================= PLAYER ================= */

function placePlayer() {
  rig.position.set(0, horizonVR * 1.3, horizonVR * 2.4);
  rig.lookAt(0, 0, 0);
}

/* ================= BODY ================= */

const BODY_SIZE_METERS = 10000;
const BODY_SIZE_VR = BODY_SIZE_METERS * METERS_TO_VR;

const N = 8;
const cubeSizeVR = BODY_SIZE_VR / N;

const cubes = [];
const material = new THREE.MeshBasicMaterial({
  color: 0xff4444,
  wireframe: true,
  transparent: true
});

for (let x = 0; x < N; x++) {
  for (let y = 0; y < N; y++) {
    for (let z = 0; z < N; z++) {

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(cubeSizeVR, cubeSizeVR, cubeSizeVR),
        material.clone()
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
        stretchZ: 1,
        opacity: 1,
        alive: true
      });
    }
  }
}

/* ================= PHYSICS ================= */

const PHYSICS_DT = 0.001;
const TIDAL_VISUAL_GAIN = 1e-6;

function drdt_obs(r) {
  return -c * (1 - RS / r);
}

function tidalRate(r) {
  return (2 * G * BH_MASS) / Math.pow(r, 3);
}

/* ================= RESET ================= */

const rStart = 6 * RS;
let running = false;

function reset() {
  cubes.forEach(c => {
    c.alive = true;
    c.r = rStart + c.offset.length() / METERS_TO_VR;
    c.stretchZ = 1;
    c.opacity = 1;
    c.mesh.visible = true;
    c.mesh.scale.set(1, 1, 1);
    c.mesh.material.opacity = 1;
  });
  running = true;
}

/* ================= XR EVENTS ================= */

renderer.xr.addEventListener('sessionstart', () => {
  placePlayer();
  reset();
});

/* ================= LOOP ================= */

renderer.setAnimationLoop(() => {

  if (!running) {
    renderer.render(scene, camera);
    return;
  }

  let alive = 0;

  cubes.forEach(c => {
    if (!c.alive) return;
    alive++;

    /* --- Radial motion --- */
    c.r += drdt_obs(c.r) * PHYSICS_DT;
    if (c.r < RS * 1.01) c.r = RS * 1.01;

    /* --- Position --- */
    const dir = c.offset.clone().normalize();
    c.mesh.position.copy(dir.multiplyScalar(c.r * METERS_TO_VR));

    /* --- Orientation --- */
    c.mesh.lookAt(0, 0, 0);

    /* --- Spaghettification near horizon only --- */
    if (c.r < 2.2 * RS) {
      c.stretchZ += tidalRate(c.r) * TIDAL_VISUAL_GAIN * PHYSICS_DT;
    }

    c.mesh.scale.set(1, 1, c.stretchZ);
    c.mesh.translateZ((c.stretchZ - 1) * cubeSizeVR * 0.5);

    /* --- Fade & despawn --- */
    if (c.stretchZ > 15) {
      c.opacity -= 0.01;
      c.mesh.material.opacity = c.opacity;
      if (c.opacity <= 0) {
        c.mesh.visible = false;
        c.alive = false;
      }
    }
  });

  if (alive === 0) {
    running = false;
    setTimeout(reset, 2000);
  }

  renderer.render(scene, camera);
});