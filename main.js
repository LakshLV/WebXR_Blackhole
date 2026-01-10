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

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  20
);

camera.position.set(0, 1.6, 0);
scene.add(camera);

///////////////////////////////
// PHYSICAL CONSTANTS (SI)
///////////////////////////////

const G = 6.67430e-11;
const c = 299792458;
const SOLAR_MASS = 1.98847e30;

///////////////////////////////
// BLACK HOLE
///////////////////////////////

const blackHole = {
  massSolar: 1e6,
  massKg: null,
  rs: null
};

blackHole.massKg = blackHole.massSolar * SOLAR_MASS;
blackHole.rs = (2 * G * blackHole.massKg) / (c * c);

///////////////////////////////
// PHYSICS RADII
///////////////////////////////

const PLAYER_PHYSICS_RADIUS = 50 * blackHole.rs;
let cubePhysicsRadius = 8 * blackHole.rs; // start between 5–10 r_s

///////////////////////////////
// RENDER MAPPING
///////////////////////////////

const HORIZON_RENDER_DISTANCE = 0.08;

function physicsRadiusToRenderZ(rPhysics) {
  return (
    (rPhysics - PLAYER_PHYSICS_RADIUS) / blackHole.rs
  ) * HORIZON_RENDER_DISTANCE;
}

///////////////////////////////
// EVENT HORIZON VISUAL
///////////////////////////////

const horizonZ = physicsRadiusToRenderZ(blackHole.rs);

const horizonRing = new THREE.Mesh(
  new THREE.RingGeometry(1.0, 1.05, 128),
  new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    side: THREE.DoubleSide
  })
);

horizonRing.rotation.x = Math.PI / 2;
horizonRing.position.set(0, 0, horizonZ);
scene.add(horizonRing);

///////////////////////////////
// CUBE
///////////////////////////////

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 0.15, 0.15),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);

scene.add(cube);

///////////////////////////////
// TIME VARIABLES
///////////////////////////////

let tau = 0; // proper time only (motion driven by τ)

///////////////////////////////
// FREE-FALL EQUATION
///////////////////////////////

// dr/dτ = -c * sqrt(r_s / r)
function radialVelocity(r) {
  return -c * Math.sqrt(blackHole.rs / r);
}

///////////////////////////////
// ADAPTIVE TIMESTEP
///////////////////////////////

const EPSILON = 1e-3;

function computeDeltaTau(r) {
  return EPSILON * r / Math.abs(radialVelocity(r));
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
// RENDER LOOP
///////////////////////////////

renderer.setAnimationLoop(() => {

  // Adaptive proper-time step
  const dTau = computeDeltaTau(cubePhysicsRadius);

  // Integrate radius
  cubePhysicsRadius += radialVelocity(cubePhysicsRadius) * dTau;
  tau += dTau;

  // Update cube position
  cube.position.set(
    0,
    1.6,
    physicsRadiusToRenderZ(cubePhysicsRadius)
  );

  // HUD debug
  hud.innerHTML = `
τ (cube): ${tau.toFixed(4)} s<br>
r / rₛ: ${(cubePhysicsRadius / blackHole.rs).toFixed(4)}<br>
dr/dτ: ${radialVelocity(cubePhysicsRadius).toExponential(3)}<br>
Δτ: ${dTau.toExponential(3)}
`;

  renderer.render(scene, camera);
});

///////////////////////////////
// RESIZE
///////////////////////////////

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
