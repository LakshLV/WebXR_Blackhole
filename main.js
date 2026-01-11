import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';

///////////////////////////////
// RENDERER
///////////////////////////////

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

///////////////////////////////
// SCENE & CAMERA
///////////////////////////////

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
camera.position.set(0, 1.6, 0);
scene.add(camera);

///////////////////////////////
// CONSTANTS
///////////////////////////////

const G = 6.67430e-11;
const c = 299792458;
const SOLAR_MASS = 1.98847e30;

///////////////////////////////
// BLACK HOLE
///////////////////////////////

const blackHole = {
  massSolar: 1e6,
  massKg: 1e6 * SOLAR_MASS,
};
blackHole.rs = (2 * G * blackHole.massKg) / (c * c);

///////////////////////////////
// PHYSICS STATE
///////////////////////////////

const PLAYER_PHYSICS_RADIUS = 50 * blackHole.rs;
let cubePhysicsRadius = 20 * blackHole.rs;

let t = 0;
let tau = 0;
let lastTime = null;

///////////////////////////////
// PHYSICS FUNCTIONS
///////////////////////////////

function radialVelocity(r) {
  return -c * Math.sqrt(blackHole.rs / r);
}

function timeDilation(r) {
  return 1 / (1 - blackHole.rs / r);
}

///////////////////////////////
// RENDER MAPPING (linear, unchanged)
///////////////////////////////

const HORIZON_RENDER_DISTANCE = 0.04;
function physicsRadiusToRenderZ(r) {
  return ((r - PLAYER_PHYSICS_RADIUS) / blackHole.rs) * HORIZON_RENDER_DISTANCE;
}

///////////////////////////////
// HORIZON
///////////////////////////////

const horizon = new THREE.Mesh(
  new THREE.RingGeometry(1.0, 1.05, 128),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide })
);
horizon.rotation.x = Math.PI / 2;
horizon.position.z = physicsRadiusToRenderZ(blackHole.rs);
scene.add(horizon);

///////////////////////////////
// CUBE
///////////////////////////////

const CUBE_SIZE_METERS = 1.0;

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.25, 0.25, 0.25),
  new THREE.MeshBasicMaterial({ color: 0xff4444 })
);
scene.add(cube);

///////////////////////////////
// SPAGHETTIFICATION
///////////////////////////////

const DISRUPTION_ACCELERATION = 1e6; // m/s^2

function tidalAcceleration(r) {
  return (2 * G * blackHole.massKg / (r ** 3)) * CUBE_SIZE_METERS;
}

///////////////////////////////
// HUD
///////////////////////////////

const hud = document.createElement('div');
hud.style.position = 'fixed';
hud.style.top = '10px';
hud.style.left = '10px';
hud.style.color = 'white';
hud.style.fontFamily = 'monospace';
hud.style.fontSize = '14px';
document.body.appendChild(hud);

///////////////////////////////
// LOOP
///////////////////////////////

renderer.setAnimationLoop(() => {
  if (!renderer.xr.isPresenting) {
    renderer.render(scene, camera);
    return;
  }

  const now = performance.now();
  if (lastTime === null) {
    lastTime = now;
    return;
  }

  const dt = (now - lastTime) * 0.001;
  lastTime = now;

  t += dt;

  const dilation = timeDilation(cubePhysicsRadius);
  const dTau = dt / dilation;

  cubePhysicsRadius += radialVelocity(cubePhysicsRadius) * dTau;
  tau += dTau;

  cube.position.set(0, 1.6, physicsRadiusToRenderZ(cubePhysicsRadius));

  // --- Spaghettification ---
  const aTidal = tidalAcceleration(cubePhysicsRadius);
  const stretch = Math.min(aTidal / DISRUPTION_ACCELERATION, 5);

  cube.scale.set(
    1,
    1,
    1 + stretch
  );

  hud.innerHTML = `
t: ${t.toFixed(2)} s<br>
τ: ${tau.toFixed(2)} s<br>
r / rₛ: ${(cubePhysicsRadius / blackHole.rs).toFixed(4)}<br>
a_tidal: ${aTidal.toExponential(3)} m/s²
`;

  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
