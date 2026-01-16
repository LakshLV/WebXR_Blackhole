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

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
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
   EVENT HORIZON VISUAL
===================================================== */

const horizonRadiusVR = blackHole.rs * METERS_TO_VR;

scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(horizonRadiusVR, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.3
  })
));

/* =====================================================
   PLAYER POSITION
===================================================== */

function placePlayer() {
  playerRig.position.set(
    0,
    horizonRadiusVR * 1.2,
    horizonRadiusVR * 2.2
  );
  playerRig.lookAt(0, 0, 0);
}

/* =====================================================
   SEGMENTED BODY (125 CUBES)
===================================================== */

const cubeSizePhysics = 10000; // meters
const cubeSizeVR = cubeSizePhysics * METERS_TO_VR;

const gridN = 5; // 5×5×5 = 125 cubes
const miniSizeVR = cubeSizeVR / gridN;

const material = new THREE.MeshBasicMaterial({ color: 0xff4444 });

const pieces = [];

/* Build cube lattice */
for (let x = 0; x < gridN; x++) {
  for (let y = 0; y < gridN; y++) {
    for (let z = 0; z < gridN; z++) {

      const geom = new THREE.BoxGeometry(miniSizeVR, miniSizeVR, miniSizeVR);
      geom.translate(miniSizeVR / 2, 0, 0); // pivot at FAR face

      const mesh = new THREE.Mesh(geom, material);
      scene.add(mesh);

      pieces.push({
        mesh,
        localOffset: new THREE.Vector3(
          (x - (gridN - 1) / 2) * miniSizeVR,
          (y - (gridN - 1) / 2) * miniSizeVR,
          (z - (gridN - 1) / 2) * miniSizeVR
        ),
        r: 0,
        alive: true
      });
    }
  }
}

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
  return (2 * G * blackHole.massKg / (r ** 3)) * cubeSizePhysics;
}

/* =====================================================
   RESET
===================================================== */

const rStart = 4 * blackHole.rs;
let running = false;

function resetSimulation() {
  pieces.forEach(p => {
    p.alive = true;
    p.r = rStart + p.localOffset.length() / METERS_TO_VR;

    const dir = p.localOffset.clone().normalize();
    p.mesh.position.copy(dir.multiplyScalar(p.r * METERS_TO_VR));
    p.mesh.scale.set(1, 1, 1);
    p.mesh.visible = true;
  });

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
   LOOP
===================================================== */

renderer.setAnimationLoop(() => {

  if (!running) {
    renderer.render(scene, camera);
    return;
  }

  let aliveCount = 0;

  pieces.forEach(p => {
    if (!p.alive) return;

    aliveCount++;

    const dTau = deltaTau(p.r);
    p.r += drdTau(p.r) * dTau;

    if (p.r <= blackHole.rs) {
      p.alive = false;
      p.mesh.visible = false;
      return;
    }

    /* Radial direction */
    const dir = p.mesh.position.clone().normalize().multiplyScalar(-1);

    /* Visual slow-down near horizon */
    const proximity = THREE.MathUtils.clamp(
      1 - (p.r - blackHole.rs) / (2 * blackHole.rs),
      0,
      1
    );

    const radiusVR = p.r * METERS_TO_VR * (1 - 0.85 * proximity);

    /* Position */
    p.mesh.position.copy(dir.multiplyScalar(-radiusVR));

    /* Orientation toward BH */
    p.mesh.lookAt(0, 0, 0);

    /* Directional spaghettification (ONLY inward face) */
    const stretch = THREE.MathUtils.clamp(
      1 + tidalAcceleration(p.r) / 600,
      1,
      16
    );

    p.mesh.scale.set(
      stretch,
      1 / Math.sqrt(stretch),
      1 / Math.sqrt(stretch)
    );
  });

  if (aliveCount === 0) {
    running = false;
    setTimeout(resetSimulation, 1500);
  }

  renderer.render(scene, camera);
});
