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
// PHYSICAL CONSTANTS
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
let cubePhysicsRadius = 30 * blackHole.rs;

///////////////////////////////
// RENDER MAPPING
///////////////////////////////

const HORIZON_RENDER_DISTANCE = 0.04;

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

let t = 0;      // coordinate time (observer)
let tau = 0;    // proper time (cube)
let lastTime = null;

///////////////////////////////
// PHYSICS FUNCTIONS
///////////////////////////////

// dr/dτ = -c * sqrt(r_s / r)
function radialVelocity(r) {
  return -c * Math.sqrt(blackHole.rs / r);
}

// dt/dτ = 1 / (1 - r_s / r)
function timeDilation(r) {
  return 1.0 / (1.0 - blackHole.rs / r);
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

  // Only run physics once VR session is active
  if (!renderer.xr.isPresenting) {
    renderer.render(scene, camera);
    return;
  }

  const now = performance.now();
  if (lastTime === null) {
    lastTime = now;
    renderer.render(scene, camera);
    return;
  }

  const dt = (now - lastTime) * 0.001;
  lastTime = now;

  // Advance coordinate time
  t += dt;

  // Time dilation factor
  const dilation = timeDilation(cubePhysicsRadius);

  // Convert observer time → proper time
  const dTau = dt / dilation;

  // Integrate motion using proper time
  cubePhysicsRadius += radialVelocity(cubePhysicsRadius) * dTau;
  tau += dTau;

  // Update render position
  cube.position.set(
    0,
    1.6,
    physicsRadiusToRenderZ(cubePhysicsRadius)
  );

  // HUD
  hud.innerHTML = `
t (observer): ${t.toFixed(2)} s<br>
τ (cube): ${tau.toFixed(2)} s<br>
r / rₛ: ${(cubePhysicsRadius / blackHole.rs).toFixed(4)}<br>
dt/dτ: ${dilation.toFixed(2)}
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
